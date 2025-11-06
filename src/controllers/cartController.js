const Cart = require('../models/Cart');
const Competition = require('../models/Competition');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const PointsHistory = require('../models/PointsHistory');
const PointsSettings = require('../models/PointsSettings');
const { generateTicketNumber } = require('../utils/ticketNumber');
const { withTransaction } = require('../utils/transactionHelper');
const { getFileUrl } = require('../utils/fileHelper');

const addToCart = async (req, res) => {
  try {
    const { competition_id, quantity = 1 } = req.body;
    const userId = req.user._id;

    // Validate competition exists and is active
    const competition = await Competition.findById(competition_id);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    if (competition.status !== 'active') {
      return res.error('Competition is not active', 400);
    }

    // Check if tickets are available
    if (competition.tickets_sold + quantity > competition.max_tickets) {
      return res.error('Not enough tickets available', 400);
    }

    // Check existing tickets and cart items for max_per_person limit
    const existingTickets = await Ticket.countDocuments({
      user_id: userId,
      competition_id,
    });

    const existingCartItem = await Cart.findOne({
      user_id: userId,
      competition_id,
    });

    const currentQuantity = existingCartItem ? existingCartItem.quantity : 0;
    const totalQuantity = existingTickets + currentQuantity + quantity;

    if (totalQuantity > competition.max_per_person) {
      const remaining = Math.max(0, competition.max_per_person - existingTickets - currentQuantity);
      return res.error(
        `Maximum ${competition.max_per_person} tickets per person. You already have ${existingTickets} ticket(s) and ${currentQuantity} in cart. You can add up to ${remaining} more.`,
        400
      );
    }

    // Add or update cart item
    const cartItem = await Cart.findOneAndUpdate(
      { user_id: userId, competition_id },
      { quantity: (existingCartItem?.quantity || 0) + quantity },
      { upsert: true, new: true }
    );

    res.success('Item added to cart successfully', { cart_item: cartItem }, 201);
  } catch (error) {
    if (error.code === 11000) {
      // Handle unique constraint violation (shouldn't happen with upsert, but just in case)
      return res.error('Item already in cart', 400);
    }
    res.error(error.message || 'Failed to add item to cart', 500);
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cartItems = await Cart.find({ user_id: userId })
      .populate('competition_id', 'title short_description image_url ticket_price max_tickets tickets_sold max_per_person status slug')
      .sort({ createdAt: -1 })
      .lean();

    // Get existing tickets count for each competition
    const competitionIds = cartItems.map(item => item.competition_id?._id).filter(Boolean);
    const existingTickets = await Ticket.aggregate([
      {
        $match: {
          user_id: userId,
          competition_id: { $in: competitionIds },
        },
      },
      {
        $group: {
          _id: '$competition_id',
          count: { $sum: 1 },
        },
      },
    ]);

    const ticketsMap = new Map(
      existingTickets.map(t => [t._id.toString(), t.count])
    );

    // Format cart items with additional information
    const formattedCartItems = cartItems.map(item => {
      const comp = item.competition_id;
      if (!comp) {
        return null;
      }

      const existingTicketCount = ticketsMap.get(comp._id.toString()) || 0;
      const availableToAdd = Math.max(0, comp.max_per_person - existingTicketCount - item.quantity);
      const totalPrice = comp.ticket_price * item.quantity;
      const remainingTickets = Math.max(0, comp.max_tickets - comp.tickets_sold);

      // Convert image_url to full URL if it's a local file
      let imageUrl = comp.image_url;
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = getFileUrl(imageUrl);
      }

      return {
        _id: item._id,
        competition_id: comp._id,
        competition_title: comp.title,
        competition_slug: comp.slug,
        competition_short_description: comp.short_description,
        competition_image_url: imageUrl,
        ticket_price: comp.ticket_price,
        quantity: item.quantity,
        total_price: totalPrice,
        max_per_person: comp.max_per_person,
        existing_tickets: existingTicketCount,
        available_to_add: availableToAdd,
        remaining_tickets: remainingTickets,
        is_active: comp.status === 'active',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    }).filter(Boolean);

    // Calculate totals
    const totalItems = formattedCartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = formattedCartItems.reduce((sum, item) => sum + item.total_price, 0);

    res.success('Cart retrieved successfully', {
      cart_items: formattedCartItems,
      summary: {
        total_items: totalItems,
        total_price: totalPrice,
        item_count: formattedCartItems.length,
      },
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve cart', 500);
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user._id;

    if (!quantity || quantity < 1) {
      return res.error('Quantity must be at least 1', 400);
    }

    const cartItem = await Cart.findOne({ _id: id, user_id: userId });
    if (!cartItem) {
      return res.error('Cart item not found', 404);
    }

    const competition = await Competition.findById(cartItem.competition_id);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    if (competition.status !== 'active') {
      return res.error('Competition is not active', 400);
    }

    // Check max tickets available
    if (competition.tickets_sold + quantity > competition.max_tickets) {
      return res.error('Not enough tickets available', 400);
    }

    // Check max_per_person limit
    const existingTickets = await Ticket.countDocuments({
      user_id: userId,
      competition_id: cartItem.competition_id,
    });

    if (existingTickets + quantity > competition.max_per_person) {
      const remaining = Math.max(0, competition.max_per_person - existingTickets);
      return res.error(
        `Maximum ${competition.max_per_person} tickets per person. You already have ${existingTickets} ticket(s). You can add up to ${remaining} more.`,
        400
      );
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    res.success('Cart item updated successfully', { cart_item: cartItem });
  } catch (error) {
    res.error(error.message || 'Failed to update cart item', 500);
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const cartItem = await Cart.findOneAndDelete({ _id: id, user_id: userId });
    if (!cartItem) {
      return res.error('Cart item not found', 404);
    }

    res.success('Item removed from cart successfully');
  } catch (error) {
    res.error(error.message || 'Failed to remove item from cart', 500);
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    await Cart.deleteMany({ user_id: userId });

    res.success('Cart cleared successfully');
  } catch (error) {
    res.error(error.message || 'Failed to clear cart', 500);
  }
};

const checkout = async (req, res) => {
  try {
    const userId = req.user._id;
    const { points_to_redeem = 0 } = req.body;

    // Points redemption rate: 100 points = $1 discount
    const POINTS_PER_DOLLAR = 100;

    await withTransaction(async (session) => {
      const withSession = (query) => session ? query.session(session) : query;
      const createOptions = session ? { session } : {};

      // Get all cart items
      const cartItems = await withSession(Cart.find({ user_id: userId }).populate('competition_id'));
      
      if (!cartItems || cartItems.length === 0) {
        return res.error('Cart is empty', 400);
      }

      const user = await withSession(User.findById(userId));
      const pointsSettings = await PointsSettings.getSettings();
      
      // Calculate total cart value first
      let cartTotal = 0;
      for (const cartItem of cartItems) {
        const competition = cartItem.competition_id;
        if (competition && competition.status === 'active') {
          cartTotal += competition.ticket_price * cartItem.quantity;
        }
      }

      // Validate and process points redemption
      let pointsRedeemed = 0;
      let discountAmount = 0;
      
      if (points_to_redeem > 0) {
        // Validate user has enough points
        if (user.total_points < points_to_redeem) {
          return res.error(`Insufficient points. You have ${user.total_points} points but trying to redeem ${points_to_redeem}`, 400);
        }

        // Validate minimum redemption (100 points minimum)
        if (points_to_redeem < 100) {
          return res.error('Minimum redemption is 100 points', 400);
        }

        // Calculate discount: 100 points = $1
        discountAmount = Math.floor(points_to_redeem / POINTS_PER_DOLLAR);
        
        // Discount cannot exceed cart total
        if (discountAmount > cartTotal) {
          // Adjust points to redeem to match cart total
          discountAmount = cartTotal;
          pointsRedeemed = Math.floor(cartTotal * POINTS_PER_DOLLAR);
        } else {
          pointsRedeemed = points_to_redeem;
        }
        
        // Deduct points from user
        user.total_points -= pointsRedeemed;
        user.total_redeemed = (user.total_redeemed || 0) + pointsRedeemed;

        // Create redemption history
        const redemptionHistory = new PointsHistory({
          user_id: userId,
          type: 'redeemed',
          amount: pointsRedeemed,
          description: `Redeemed ${pointsRedeemed} points for $${discountAmount.toFixed(2)} discount on cart checkout`,
        });
        await (session ? redemptionHistory.save({ session }) : redemptionHistory.save());
      }
      
      const purchaseResults = [];
      const errors = [];
      let totalSpent = 0;
      let totalPointsEarned = 0;

      // Process each cart item
      for (const cartItem of cartItems) {
        const competition = cartItem.competition_id;
        const quantity = cartItem.quantity;

        try {
          // Validate competition
          if (!competition) {
            errors.push({ competition_id: cartItem.competition_id, error: 'Competition not found' });
            continue;
          }

          if (competition.status !== 'active') {
            errors.push({ competition_id: competition._id, error: 'Competition is not active' });
            continue;
          }

          // Check ticket availability
          if (competition.tickets_sold + quantity > competition.max_tickets) {
            errors.push({ competition_id: competition._id, error: 'Not enough tickets available' });
            continue;
          }

          // Check max_per_person limit
          const userTickets = await withSession(Ticket.countDocuments({
            user_id: userId,
            competition_id: competition._id,
          }));

          if (userTickets + quantity > competition.max_per_person) {
            const remaining = Math.max(0, competition.max_per_person - userTickets);
            errors.push({
              competition_id: competition._id,
              error: `Maximum ${competition.max_per_person} tickets per person. You already have ${userTickets} ticket(s). You can purchase up to ${remaining} more.`
            });
            continue;
          }

          // Generate tickets
          const tickets = [];
          const MAX_RETRY_ATTEMPTS = 50;
          
          for (let i = 0; i < quantity; i++) {
            let ticketNumber = generateTicketNumber();
            let attempts = 0;
            
            while (await withSession(Ticket.findOne({ ticket_number: ticketNumber }))) {
              attempts++;
              if (attempts >= MAX_RETRY_ATTEMPTS) {
                throw new Error('Failed to generate unique ticket number');
              }
              ticketNumber = generateTicketNumber();
            }

            tickets.push(
              new Ticket({
                ticket_number: ticketNumber,
                user_id: userId,
                competition_id: competition._id,
                price: competition.ticket_price,
              })
            );
          }

          await Ticket.insertMany(tickets, createOptions);

          // Update competition
          competition.tickets_sold += quantity;
          await (session ? competition.save({ session }) : competition.save());

          // Calculate points and spending
          const itemPrice = competition.ticket_price * quantity;
          
          // Apply proportional discount to this item
          const itemDiscount = cartTotal > 0 ? (itemPrice / cartTotal) * discountAmount : 0;
          const dollarsSpent = Math.max(0, itemPrice - itemDiscount);
          
          const pointsEarned = pointsSettings.is_active 
            ? Math.floor(dollarsSpent * pointsSettings.points_per_dollar)
            : 0;

          totalSpent += dollarsSpent;
          totalPointsEarned += pointsEarned;

          // Update user points
          if (pointsEarned > 0) {
            user.total_points += pointsEarned;
            user.total_earned += pointsEarned;
          }

          // Create points history
          if (pointsEarned > 0) {
            const earnedHistory = new PointsHistory({
              user_id: userId,
              type: 'earned',
              amount: pointsEarned,
              description: `Earned ${pointsEarned} points for purchasing ${quantity} ticket(s) for ${competition.title} ($${dollarsSpent.toFixed(2)} spent)`,
            });
            await (session ? earnedHistory.save({ session }) : earnedHistory.save());
          }

          purchaseResults.push({
            competition_id: competition._id,
            competition_title: competition.title,
            quantity,
            tickets: tickets.map(t => ({
              ticket_number: t.ticket_number,
              price: t.price,
            })),
            original_price: itemPrice,
            discount_applied: itemDiscount,
            total_price: dollarsSpent,
            points_earned: pointsEarned,
          });
        } catch (error) {
          errors.push({
            competition_id: cartItem.competition_id,
            error: error.message || 'Failed to process purchase',
          });
        }
      }

      // If no successful purchases, return error
      if (purchaseResults.length === 0) {
        return res.error('Failed to checkout. All items had errors.', 400, { errors });
      }

      // Update user total spent (actual amount paid after discount)
      user.total_spent += totalSpent;
      await (session ? user.save({ session }) : user.save());

      // Clear successfully purchased items from cart
      const purchasedCompetitionIds = purchaseResults.map(r => r.competition_id);
      await withSession(Cart.deleteMany({
        user_id: userId,
        competition_id: { $in: purchasedCompetitionIds },
      }));

      res.success('Checkout completed successfully', {
        purchases: purchaseResults,
        summary: {
          total_items_purchased: purchaseResults.length,
          total_tickets: purchaseResults.reduce((sum, p) => sum + p.quantity, 0),
          cart_total: cartTotal,
          discount_applied: discountAmount,
          total_spent: totalSpent,
          points_redeemed: pointsRedeemed,
          total_points_earned: totalPointsEarned,
          total_points_balance: user.total_points,
        },
        errors: errors.length > 0 ? errors : undefined,
      }, 201);
    });
  } catch (error) {
    res.error(error.message || 'Failed to checkout', 500);
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  checkout,
};

