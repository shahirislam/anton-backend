const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const Competition = require('../models/Competition');
const User = require('../models/User');
const Cart = require('../models/Cart');
const PointsHistory = require('../models/PointsHistory');
const PointsSettings = require('../models/PointsSettings');
const { generateTicketNumber } = require('../utils/ticketNumber');
const { withTransaction } = require('../utils/transactionHelper');
const stripeService = require('../services/stripeService');
const logger = require('../utils/logger');

/**
 * Create payment intent for single ticket purchase
 */
const createSinglePurchaseIntent = async (req, res) => {
  try {
    const { competition_id, quantity = 1 } = req.body;
    const userId = req.user._id;

    // Validate competition
    const competition = await Competition.findById(competition_id);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    if (competition.status !== 'active') {
      return res.error('Competition is not active', 400);
    }

    if (competition.tickets_sold + quantity > competition.max_tickets) {
      return res.error('Not enough tickets available', 400);
    }

    // Check max_per_person limit
    const existingTickets = await Ticket.countDocuments({
      user_id: userId,
      competition_id,
    });

    if (existingTickets + quantity > competition.max_per_person) {
      const remaining = Math.max(0, competition.max_per_person - existingTickets);
      return res.error(
        `Maximum ${competition.max_per_person} tickets per person. You already have ${existingTickets} ticket(s), and can purchase up to ${remaining} more.`,
        400
      );
    }

    // Calculate total amount
    const totalAmount = competition.ticket_price * quantity;

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: totalAmount,
      currency: 'usd',
      userId: userId,
      paymentType: 'single_purchase',
      metadata: {
        competition_id: competition_id,
        quantity: quantity.toString(),
      },
    });

    // Save payment record
    const payment = new Payment({
      user_id: userId,
      payment_intent_id: paymentIntent.id,
      amount: totalAmount,
      currency: 'usd',
      status: 'pending',
      payment_type: 'single_purchase',
      competition_id: competition_id,
      quantity: quantity,
      metadata: {
        competition_title: competition.title,
      },
    });

    await payment.save();

    res.success('Payment intent created successfully', {
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: totalAmount,
      currency: 'usd',
    }, 201);
  } catch (error) {
    logger.error('Failed to create payment intent for single purchase', {
      error: error.message,
      user_id: req.user._id,
    });
    res.error(error.message || 'Failed to create payment intent', 500);
  }
};

/**
 * Create payment intent for cart checkout
 */
const createCheckoutIntent = async (req, res) => {
  try {
    const userId = req.user._id;
    const { points_to_redeem = 0 } = req.body;

    const POINTS_PER_DOLLAR = 100;

    // Get all cart items
    const cartItems = await Cart.find({ user_id: userId }).populate('competition_id');
    
    if (!cartItems || cartItems.length === 0) {
      return res.error('Cart is empty', 400);
    }

    // Calculate total cart value
    let cartTotal = 0;
    const validCartItems = [];

    for (const cartItem of cartItems) {
      const competition = cartItem.competition_id;
      if (competition && competition.status === 'active') {
        cartTotal += competition.ticket_price * cartItem.quantity;
        validCartItems.push({
          competition_id: competition._id,
          quantity: cartItem.quantity,
        });
      }
    }

    if (validCartItems.length === 0) {
      return res.error('No active competitions in cart', 400);
    }

    // Validate and calculate points redemption
    const user = await User.findById(userId);
    let pointsRedeemed = 0;
    let discountAmount = 0;

    if (points_to_redeem > 0) {
      if (user.total_points < points_to_redeem) {
        return res.error(`Insufficient points. You have ${user.total_points} points but trying to redeem ${points_to_redeem}`, 400);
      }

      if (points_to_redeem < 100) {
        return res.error('Minimum redemption is 100 points', 400);
      }

      discountAmount = Math.floor(points_to_redeem / POINTS_PER_DOLLAR);
      
      if (discountAmount > cartTotal) {
        discountAmount = cartTotal;
        pointsRedeemed = Math.floor(cartTotal * POINTS_PER_DOLLAR);
      } else {
        pointsRedeemed = points_to_redeem;
      }
    }

    const finalAmount = Math.max(0, cartTotal - discountAmount);

    if (finalAmount < 0.5) {
      // Stripe minimum is $0.50
      return res.error('Final amount after discount is too low. Minimum payment is $0.50', 400);
    }

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: finalAmount,
      currency: 'usd',
      userId: userId,
      paymentType: 'cart_checkout',
      metadata: {
        cart_items_count: validCartItems.length.toString(),
        points_redeemed: pointsRedeemed.toString(),
        discount_amount: discountAmount.toString(),
      },
    });

    // Save payment record
    const payment = new Payment({
      user_id: userId,
      payment_intent_id: paymentIntent.id,
      amount: finalAmount,
      currency: 'usd',
      status: 'pending',
      payment_type: 'cart_checkout',
      cart_items: validCartItems,
      points_redeemed: pointsRedeemed,
      discount_amount: discountAmount,
      metadata: {
        cart_total: cartTotal.toString(),
      },
    });

    await payment.save();

    res.success('Payment intent created successfully', {
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: finalAmount,
      currency: 'usd',
      cart_total: cartTotal,
      discount_amount: discountAmount,
      points_redeemed: pointsRedeemed,
    }, 201);
  } catch (error) {
    logger.error('Failed to create payment intent for checkout', {
      error: error.message,
      user_id: req.user._id,
    });
    res.error(error.message || 'Failed to create payment intent', 500);
  }
};
  
/**
 * Handle Stripe webhook events
 */
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Get raw body for signature verification (it's a Buffer from express.raw())
    const payload = req.body;
    // Convert Buffer to string for signature verification
    const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : JSON.stringify(payload);
    event = stripeService.verifyWebhookSignature(payloadString, sig);
  } catch (error) {
    logger.error('Webhook signature verification failed', {
      error: error.message,
    });
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', {
      error: error.message,
      event_type: event.type,
      payment_intent_id: event.data.object?.id,
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Process successful payment and create tickets
 */
const handlePaymentSuccess = async (paymentIntent) => {
  const paymentIntentId = paymentIntent.id;

  try {
    await withTransaction(async (session) => {
      const withSession = (query) => session ? query.session(session) : query;
      const createOptions = session ? { session } : {};

      // Find payment record
      const payment = await withSession(Payment.findOne({ payment_intent_id: paymentIntentId }));
      if (!payment) {
        logger.error('Payment record not found for successful payment intent', {
          payment_intent_id: paymentIntentId,
        });
        return;
      }

      // Check if tickets already created (idempotency)
      if (payment.tickets_created) {
        logger.info('Tickets already created for this payment', {
          payment_intent_id: paymentIntentId,
        });
        return;
      }

      // Update payment status
      payment.status = 'succeeded';
      payment.stripe_response = paymentIntent;
      await (session ? payment.save({ session }) : payment.save());

      const userId = payment.user_id;
      const user = await withSession(User.findById(userId));
      const pointsSettings = await PointsSettings.getSettings();

      let totalSpent = 0;
      let totalPointsEarned = 0;
      const createdTicketIds = [];

      if (payment.payment_type === 'single_purchase') {
        // Single purchase flow
        const competition = await withSession(Competition.findById(payment.competition_id));
        if (!competition || competition.status !== 'active') {
          throw new Error('Competition not found or not active');
        }

        // Generate tickets
        const tickets = [];
        const MAX_RETRY_ATTEMPTS = 50;

        for (let i = 0; i < payment.quantity; i++) {
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
              competition_id: payment.competition_id,
              price: competition.ticket_price,
            })
          );
        }

        await Ticket.insertMany(tickets, createOptions);
        createdTicketIds.push(...tickets.map(t => t._id));

        // Update competition
        competition.tickets_sold += payment.quantity;
        await (session ? competition.save({ session }) : competition.save());

        // Calculate points
        const dollarsSpent = competition.ticket_price * payment.quantity;
        totalSpent = dollarsSpent;
        const pointsEarned = pointsSettings.is_active
          ? Math.floor(dollarsSpent * pointsSettings.points_per_dollar)
          : 0;
        totalPointsEarned = pointsEarned;

        if (pointsEarned > 0) {
          user.total_points += pointsEarned;
          user.total_earned += pointsEarned;

          const earnedHistory = new PointsHistory({
            user_id: userId,
            type: 'earned',
            amount: pointsEarned,
            description: `Earned ${pointsEarned} points for purchasing ${payment.quantity} ticket(s) ($${dollarsSpent.toFixed(2)} spent)`,
          });
          await (session ? earnedHistory.save({ session }) : earnedHistory.save());
        }
      } else if (payment.payment_type === 'cart_checkout') {
        // Cart checkout flow
        const user = await withSession(User.findById(userId));

        // Process points redemption if applicable
        if (payment.points_redeemed > 0) {
          user.total_points -= payment.points_redeemed;
          user.total_redeemed = (user.total_redeemed || 0) + payment.points_redeemed;

          const redemptionHistory = new PointsHistory({
            user_id: userId,
            type: 'redeemed',
            amount: payment.points_redeemed,
            description: `Redeemed ${payment.points_redeemed} points for $${payment.discount_amount.toFixed(2)} discount on cart checkout`,
          });
          await (session ? redemptionHistory.save({ session }) : redemptionHistory.save());
        }

        // Process each cart item
        for (const cartItem of payment.cart_items) {
          const competition = await withSession(Competition.findById(cartItem.competition_id));
          if (!competition || competition.status !== 'active') {
            continue;
          }

          // Generate tickets
          const tickets = [];
          const MAX_RETRY_ATTEMPTS = 50;

          for (let i = 0; i < cartItem.quantity; i++) {
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
                competition_id: cartItem.competition_id,
                price: competition.ticket_price,
              })
            );
          }

          await Ticket.insertMany(tickets, createOptions);
          createdTicketIds.push(...tickets.map(t => t._id));

          // Update competition
          competition.tickets_sold += cartItem.quantity;
          await (session ? competition.save({ session }) : competition.save());

          // Calculate points (after discount)
          const itemPrice = competition.ticket_price * cartItem.quantity;
          // Calculate cart total from all items for proportional discount
          let cartTotal = 0;
          for (const item of payment.cart_items) {
            const comp = await withSession(Competition.findById(item.competition_id));
            if (comp) {
              cartTotal += comp.ticket_price * item.quantity;
            }
          }
          const itemDiscount = cartTotal > 0 ? (itemPrice / cartTotal) * payment.discount_amount : 0;
          const dollarsSpent = Math.max(0, itemPrice - itemDiscount);
          totalSpent += dollarsSpent;

          const pointsEarned = pointsSettings.is_active
            ? Math.floor(dollarsSpent * pointsSettings.points_per_dollar)
            : 0;
          totalPointsEarned += pointsEarned;

          if (pointsEarned > 0) {
            user.total_points += pointsEarned;
            user.total_earned += pointsEarned;

            const earnedHistory = new PointsHistory({
              user_id: userId,
              type: 'earned',
              amount: pointsEarned,
              description: `Earned ${pointsEarned} points for purchasing ${cartItem.quantity} ticket(s) for ${competition.title} ($${dollarsSpent.toFixed(2)} spent)`,
            });
            await (session ? earnedHistory.save({ session }) : earnedHistory.save());
          }
        }

        // Clear cart
        const purchasedCompetitionIds = payment.cart_items.map(item => item.competition_id);
        await withSession(Cart.deleteMany({
          user_id: userId,
          competition_id: { $in: purchasedCompetitionIds },
        }));
      }

      // Update user total spent
      user.total_spent += totalSpent;
      await (session ? user.save({ session }) : user.save());

      // Mark payment as processed
      payment.tickets_created = true;
      payment.ticket_ids = createdTicketIds;
      await (session ? payment.save({ session }) : payment.save());

      logger.info('Payment processed successfully and tickets created', {
        payment_intent_id: paymentIntentId,
        user_id: userId,
        tickets_created: createdTicketIds.length,
        total_spent: totalSpent,
        points_earned: totalPointsEarned,
      });
    });
  } catch (error) {
    logger.error('Failed to process payment success', {
      error: error.message,
      payment_intent_id: paymentIntentId,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Handle payment failure
 */
const handlePaymentFailure = async (paymentIntent) => {
  try {
    const payment = await Payment.findOne({ payment_intent_id: paymentIntent.id });
    if (payment) {
      payment.status = 'failed';
      payment.stripe_response = paymentIntent;
      await payment.save();

      logger.info('Payment marked as failed', {
        payment_intent_id: paymentIntent.id,
        user_id: payment.user_id,
      });
    }
  } catch (error) {
    logger.error('Failed to handle payment failure', {
      error: error.message,
      payment_intent_id: paymentIntent.id,
    });
  }
};

/**
 * Handle payment cancellation
 */
const handlePaymentCanceled = async (paymentIntent) => {
  try {
    const payment = await Payment.findOne({ payment_intent_id: paymentIntent.id });
    if (payment) {
      payment.status = 'canceled';
      payment.stripe_response = paymentIntent;
      await payment.save();

      logger.info('Payment marked as canceled', {
        payment_intent_id: paymentIntent.id,
        user_id: payment.user_id,
      });
    }
  } catch (error) {
    logger.error('Failed to handle payment cancellation', {
      error: error.message,
      payment_intent_id: paymentIntent.id,
    });
  }
};

/**
 * Get payment status
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { payment_intent_id } = req.params;
    const userId = req.user._id;

    const payment = await Payment.findOne({
      payment_intent_id,
      user_id: userId,
    });

    if (!payment) {
      return res.error('Payment not found', 404);
    }

    res.success('Payment status retrieved successfully', {
      payment_intent_id: payment.payment_intent_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      tickets_created: payment.tickets_created,
      created_at: payment.createdAt,
      updated_at: payment.updatedAt,
    });
  } catch (error) {
    res.error(error.message || 'Failed to get payment status', 500);
  }
};

module.exports = {
  createSinglePurchaseIntent,
  createCheckoutIntent,
  handleWebhook,
  getPaymentStatus,
};

