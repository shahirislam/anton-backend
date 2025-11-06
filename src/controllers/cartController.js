const Cart = require('../models/Cart');
const Competition = require('../models/Competition');
const Ticket = require('../models/Ticket');
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

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};

