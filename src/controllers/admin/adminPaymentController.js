const Payment = require('../../models/Payment');
const User = require('../../models/User');
const Competition = require('../../models/Competition');
const Ticket = require('../../models/Ticket');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');
const stripeService = require('../../services/stripeService');
const { withTransaction } = require('../../utils/transactionHelper');
const logger = require('../../utils/logger');
const Joi = require('joi');

/**
 * Generate transaction ID (TXN-XXXXXX format)
 */
const generateTransactionId = () => {
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `TXN-${randomNum}`;
};

/**
 * Map payment status to API format (succeeded -> completed)
 */
const mapPaymentStatus = (status) => {
  if (status === 'succeeded') return 'completed';
  return status;
};

/**
 * Get payment statistics
 */
const getPaymentStats = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      {
        $facet: {
          totalRevenue: [
            { $match: { status: { $in: ['succeeded', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ],
          successfulPayments: [
            { $match: { status: { $in: ['succeeded', 'completed'] } } },
            { $count: 'count' },
          ],
          failedPayments: [
            { $match: { status: 'failed' } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const totalRevenue = stats[0].totalRevenue[0]?.total || 0;
    const successfulCount = stats[0].successfulPayments[0]?.count || 0;
    const failedCount = stats[0].failedPayments[0]?.count || 0;
    const averageOrder = successfulCount > 0 ? totalRevenue / successfulCount : 0;

    res.success('Payment statistics retrieved successfully', {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      successfulPayments: successfulCount,
      failedPayments: failedCount,
      averageOrder: parseFloat(averageOrder.toFixed(2)),
    });
  } catch (error) {
    logger.error('Failed to get payment statistics', { error: error.message });
    res.error(error.message || 'Failed to retrieve payment statistics', 500);
  }
};

/**
 * Get all payments with filtering and pagination
 */
const getPayments = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { status, dateRange, amountRange, startDate, endDate } = req.query;

    // Build query
    const query = {};

    // Status filter
    if (status) {
      // Map 'completed' to both 'succeeded' and 'completed' for backward compatibility
      if (status === 'completed') {
        query.status = { $in: ['succeeded', 'completed'] };
      } else {
        query.status = status;
      }
    }

    // Date range filter
    if (dateRange || startDate || endDate) {
      query.createdAt = {};
      
      if (dateRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        query.createdAt.$gte = today;
        query.createdAt.$lt = tomorrow;
      } else if (dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query.createdAt.$gte = weekAgo;
      } else if (dateRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        query.createdAt.$gte = monthAgo;
      }

      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Amount range filter
    if (amountRange) {
      if (amountRange === 'low') {
        query.amount = { $lt: 10 };
      } else if (amountRange === 'medium') {
        query.amount = { $gte: 10, $lte: 50 };
      } else if (amountRange === 'high') {
        query.amount = { $gt: 50 };
      }
    }

    // Get payments with populated user and competition data
    const payments = await Payment.find(query)
      .populate('user_id', 'name email')
      .populate('competition_id', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Format payments for response
    const formattedPayments = await Promise.all(
      payments.map(async (payment) => {
        const paymentObj = payment.toObject();
        
        // Generate transaction ID if not exists
        if (!paymentObj.transaction_id) {
          paymentObj.transaction_id = generateTransactionId();
          // Optionally save it (async, don't wait)
          Payment.findByIdAndUpdate(paymentObj._id, { transaction_id: paymentObj.transaction_id }).catch(() => {});
        }

        // Calculate tickets purchased
        let ticketsPurchased = 0;
        if (paymentObj.payment_type === 'single_purchase') {
          ticketsPurchased = paymentObj.quantity || 0;
        } else if (paymentObj.payment_type === 'cart_checkout' && paymentObj.cart_items) {
          ticketsPurchased = paymentObj.cart_items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }

        // Get competition name (handle both single and cart checkout)
        let competitionName = null;
        let competitionId = null;
        if (paymentObj.payment_type === 'single_purchase' && paymentObj.competition_id) {
          if (typeof paymentObj.competition_id === 'object') {
            competitionName = paymentObj.competition_id.title;
            competitionId = paymentObj.competition_id._id;
          } else {
            competitionId = paymentObj.competition_id;
          }
        } else if (paymentObj.payment_type === 'cart_checkout' && paymentObj.cart_items?.length > 0) {
          // For cart checkout, use first competition or concatenate
          const firstCompId = paymentObj.cart_items[0].competition_id;
          if (firstCompId) {
            competitionId = firstCompId;
          }
        }

        // If competition_id is a string, fetch the competition
        if (competitionId && typeof competitionId === 'string' && !competitionName) {
          try {
            const comp = await Competition.findById(competitionId);
            if (comp) competitionName = comp.title;
          } catch (e) {
            // Ignore
          }
        }

        return {
          _id: paymentObj._id,
          transactionId: paymentObj.transaction_id,
          userId: paymentObj.user_id?._id || paymentObj.user_id,
          userEmail: paymentObj.user_id?.email || null,
          userName: paymentObj.user_id?.name || null,
          competitionId: competitionId,
          competitionName: competitionName || 'Multiple Competitions',
          amount: paymentObj.amount,
          currency: paymentObj.currency?.toUpperCase() || 'USD',
          status: mapPaymentStatus(paymentObj.status),
          paymentMethod: 'stripe', // Default to stripe
          paymentProvider: 'stripe',
          ticketsPurchased: ticketsPurchased,
          createdAt: paymentObj.createdAt,
          updatedAt: paymentObj.updatedAt,
          refundedAt: paymentObj.refunded_at || null,
          refundReason: paymentObj.refund_reason || null,
          failureReason: paymentObj.failure_reason || null,
        };
      })
    );

    const total = await Payment.countDocuments(query);

    res.success('Payments retrieved successfully', {
      payments: formattedPayments,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    logger.error('Failed to get payments', { error: error.message });
    res.error(error.message || 'Failed to retrieve payments', 500);
  }
};

/**
 * Get payment details by ID
 */
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id)
      .populate('user_id', 'name email phone_number')
      .populate('competition_id', 'title slug');

    if (!payment) {
      return res.error('Payment not found', 404);
    }

    const paymentObj = payment.toObject();

    // Generate transaction ID if not exists
    if (!paymentObj.transaction_id) {
      paymentObj.transaction_id = generateTransactionId();
      await Payment.findByIdAndUpdate(paymentObj._id, { transaction_id: paymentObj.transaction_id });
    }

    // Get ticket numbers
    const ticketNumbers = [];
    if (paymentObj.ticket_ids && paymentObj.ticket_ids.length > 0) {
      const tickets = await Ticket.find({ _id: { $in: paymentObj.ticket_ids } }).select('ticket_number');
      ticketNumbers.push(...tickets.map(t => t.ticket_number));
    }

    // Calculate tickets purchased
    let ticketsPurchased = 0;
    if (paymentObj.payment_type === 'single_purchase') {
      ticketsPurchased = paymentObj.quantity || 0;
    } else if (paymentObj.payment_type === 'cart_checkout' && paymentObj.cart_items) {
      ticketsPurchased = paymentObj.cart_items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    }

    // Get competition details
    let competition = null;
    if (paymentObj.payment_type === 'single_purchase' && paymentObj.competition_id) {
      if (typeof paymentObj.competition_id === 'object') {
        competition = {
          _id: paymentObj.competition_id._id,
          title: paymentObj.competition_id.title,
          slug: paymentObj.competition_id.slug,
        };
      } else {
        const comp = await Competition.findById(paymentObj.competition_id);
        if (comp) {
          competition = {
            _id: comp._id,
            title: comp.title,
            slug: comp.slug,
          };
        }
      }
    }

    // Get provider transaction ID from Stripe response
    const providerTransactionId = paymentObj.stripe_response?.charges?.data?.[0]?.id || 
                                  paymentObj.stripe_response?.id || 
                                  paymentObj.provider_transaction_id || 
                                  null;

    const formattedPayment = {
      _id: paymentObj._id,
      transactionId: paymentObj.transaction_id,
      userId: paymentObj.user_id?._id || paymentObj.user_id,
      user: paymentObj.user_id ? {
        _id: paymentObj.user_id._id || paymentObj.user_id,
        name: paymentObj.user_id.name,
        email: paymentObj.user_id.email,
        phone_number: paymentObj.user_id.phone_number || null,
      } : null,
      competitionId: competition?._id || paymentObj.competition_id,
      competition: competition,
      amount: paymentObj.amount,
      currency: paymentObj.currency?.toUpperCase() || 'USD',
      status: mapPaymentStatus(paymentObj.status),
      paymentMethod: 'stripe',
      paymentProvider: 'stripe',
      providerTransactionId: providerTransactionId,
      ticketsPurchased: ticketsPurchased,
      ticketNumbers: ticketNumbers,
      createdAt: paymentObj.createdAt,
      updatedAt: paymentObj.updatedAt,
      refundedAt: paymentObj.refunded_at || null,
      refundReason: paymentObj.refund_reason || null,
      failureReason: paymentObj.failure_reason || null,
      billingAddress: null, // Not stored currently, can be added later
    };

    res.success('Payment retrieved successfully', {
      payment: formattedPayment,
    });
  } catch (error) {
    logger.error('Failed to get payment by ID', { error: error.message, payment_id: req.params.id });
    res.error(error.message || 'Failed to retrieve payment', 500);
  }
};

/**
 * Refund a payment
 */
const refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, amount, partialRefund } = req.body;

    await withTransaction(async (session) => {
      const withSession = (query) => session ? query.session(session) : query;

      const payment = await withSession(Payment.findById(id));
      if (!payment) {
        return res.error('Payment not found', 404);
      }

      // Check if payment can be refunded
      if (payment.status !== 'succeeded' && payment.status !== 'completed') {
        return res.error(
          `Payment cannot be refunded. Current status: ${payment.status}`,
          400
        );
      }

      if (payment.status === 'refunded') {
        return res.error('Payment has already been refunded', 400);
      }

      // Calculate refund amount
      const refundAmount = partialRefund && amount ? amount : payment.amount;

      if (refundAmount > payment.amount) {
        return res.error('Refund amount cannot exceed payment amount', 400);
      }

      // Create refund via Stripe
      try {
        const stripeRefund = await stripeService.createRefund(
          payment.payment_intent_id,
          partialRefund ? refundAmount : null
        );

        // Update payment record
        payment.status = 'refunded';
        payment.refund_reason = reason || 'Admin refund';
        payment.refunded_at = new Date();
        payment.refund_amount = refundAmount;
        payment.provider_transaction_id = stripeRefund.id;
        await (session ? payment.save({ session }) : payment.save());

        // Update tickets status to refunded
        if (payment.ticket_ids && payment.ticket_ids.length > 0) {
          await withSession(Ticket.updateMany(
            { _id: { $in: payment.ticket_ids } },
            { status: 'refunded' }
          ));
        }

        // Update user total_spent (deduct refunded amount)
        const user = await withSession(User.findById(payment.user_id));
        if (user) {
          user.total_spent = Math.max(0, user.total_spent - refundAmount);
          await (session ? user.save({ session }) : user.save());
        }

        // Update competition tickets_sold if needed
        if (payment.payment_type === 'single_purchase' && payment.competition_id) {
          const competition = await withSession(Competition.findById(payment.competition_id));
          if (competition) {
            competition.tickets_sold = Math.max(0, competition.tickets_sold - (payment.quantity || 0));
            await (session ? competition.save({ session }) : competition.save());
          }
        } else if (payment.payment_type === 'cart_checkout' && payment.cart_items) {
          for (const item of payment.cart_items) {
            const competition = await withSession(Competition.findById(item.competition_id));
            if (competition) {
              competition.tickets_sold = Math.max(0, competition.tickets_sold - (item.quantity || 0));
              await (session ? competition.save({ session }) : competition.save());
            }
          }
        }

        logger.info('Payment refunded successfully', {
          payment_id: id,
          refund_amount: refundAmount,
          stripe_refund_id: stripeRefund.id,
        });

        res.success('Payment refunded successfully', {
          payment: {
            _id: payment._id,
            transactionId: payment.transaction_id || generateTransactionId(),
            status: 'refunded',
            refundedAt: payment.refunded_at,
            refundReason: payment.refund_reason,
            refundAmount: payment.refund_amount,
            updatedAt: payment.updatedAt,
          },
        });
      } catch (stripeError) {
        logger.error('Stripe refund failed', {
          error: stripeError.message,
          payment_id: id,
        });
        throw new Error(`Stripe refund failed: ${stripeError.message}`);
      }
    });
  } catch (error) {
    logger.error('Failed to refund payment', {
      error: error.message,
      payment_id: req.params.id,
    });
    res.error(error.message || 'Failed to refund payment', 500);
  }
};

/**
 * Retry a failed payment
 */
const retryPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.error('Payment not found', 404);
    }

    // Check if payment can be retried
    if (payment.status !== 'failed') {
      return res.error(
        `Payment cannot be retried. Current status: ${payment.status}`,
        400
      );
    }

    // Update payment status to pending for retry
    payment.status = 'pending';
    payment.failure_reason = null;
    await payment.save();

    logger.info('Payment retry initiated', {
      payment_id: id,
      payment_intent_id: payment.payment_intent_id,
    });

    res.success('Payment retry initiated successfully', {
      payment: {
        _id: payment._id,
        transactionId: payment.transaction_id || generateTransactionId(),
        status: 'pending',
        updatedAt: payment.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Failed to retry payment', {
      error: error.message,
      payment_id: req.params.id,
    });
    res.error(error.message || 'Failed to retry payment', 500);
  }
};

// Validation schemas
const refundValidation = Joi.object({
  reason: Joi.string().optional().messages({
    'string.base': 'Reason must be a string',
  }),
  amount: Joi.number().min(0.01).optional().messages({
    'number.min': 'Amount must be greater than 0',
    'number.base': 'Amount must be a number',
  }),
  partialRefund: Joi.boolean().optional().messages({
    'boolean.base': 'Partial refund must be a boolean',
  }),
});

const retryValidation = Joi.object({
  paymentMethod: Joi.string().optional().messages({
    'string.base': 'Payment method must be a string',
  }),
  cardToken: Joi.string().optional().messages({
    'string.base': 'Card token must be a string',
  }),
});

module.exports = {
  getPaymentStats,
  getPayments,
  getPaymentById,
  refundPayment,
  retryPayment,
  refundValidation,
  retryValidation,
};

