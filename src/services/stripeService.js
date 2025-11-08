const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

/**
 * Create a payment intent for ticket purchase
 * @param {Object} params - Payment parameters
 * @param {Number} params.amount - Amount in cents
 * @param {String} params.currency - Currency code (default: 'usd')
 * @param {String} params.userId - User ID
 * @param {String} params.paymentType - 'single_purchase' or 'cart_checkout'
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Stripe payment intent
 */
const createPaymentIntent = async ({ amount, currency = 'usd', userId, paymentType, metadata = {} }) => {
  try {
    if (!amount || amount < 50) {
      // Stripe minimum is $0.50 (50 cents)
      throw new Error('Amount must be at least $0.50');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        user_id: userId,
        payment_type: paymentType,
        ...metadata,
      },
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logger.info('Payment intent created', {
      payment_intent_id: paymentIntent.id,
      amount: amount,
      user_id: userId,
      payment_type: paymentType,
    });

    return paymentIntent;
  } catch (error) {
    logger.error('Failed to create payment intent', {
      error: error.message,
      user_id: userId,
      amount: amount,
    });
    throw error;
  }
};

/**
 * Retrieve a payment intent from Stripe
 * @param {String} paymentIntentId - Stripe payment intent ID
 * @returns {Promise<Object>} Stripe payment intent
 */
const retrievePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    logger.error('Failed to retrieve payment intent', {
      error: error.message,
      payment_intent_id: paymentIntentId,
    });
    throw error;
  }
};

/**
 * Confirm a payment intent
 * @param {String} paymentIntentId - Stripe payment intent ID
 * @param {String} paymentMethodId - Payment method ID (optional)
 * @returns {Promise<Object>} Confirmed payment intent
 */
const confirmPaymentIntent = async (paymentIntentId, paymentMethodId = null) => {
  try {
    const params = {};
    if (paymentMethodId) {
      params.payment_method = paymentMethodId;
    }

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, params);
    return paymentIntent;
  } catch (error) {
    logger.error('Failed to confirm payment intent', {
      error: error.message,
      payment_intent_id: paymentIntentId,
    });
    throw error;
  }
};

/**
 * Cancel a payment intent
 * @param {String} paymentIntentId - Stripe payment intent ID
 * @returns {Promise<Object>} Canceled payment intent
 */
const cancelPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    logger.info('Payment intent canceled', {
      payment_intent_id: paymentIntentId,
    });
    return paymentIntent;
  } catch (error) {
    logger.error('Failed to cancel payment intent', {
      error: error.message,
      payment_intent_id: paymentIntentId,
    });
    throw error;
  }
};

/**
 * Create a refund for a payment intent
 * @param {String} paymentIntentId - Stripe payment intent ID
 * @param {Number} amount - Amount to refund in dollars (optional, full refund if not provided)
 * @returns {Promise<Object>} Refund object
 */
const createRefund = async (paymentIntentId, amount = null) => {
  try {
    const params = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      params.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(params);
    logger.info('Refund created', {
      payment_intent_id: paymentIntentId,
      refund_id: refund.id,
      amount: amount || 'full',
    });
    return refund;
  } catch (error) {
    logger.error('Failed to create refund', {
      error: error.message,
      payment_intent_id: paymentIntentId,
    });
    throw error;
  }
};

/**
 * Verify webhook signature
 * @param {String} payload - Raw request body (as string)
 * @param {String} signature - Stripe signature header
 * @returns {Object} Webhook event
 */
const verifyWebhookSignature = (payload, signature) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    // Ensure payload is a string
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const event = stripe.webhooks.constructEvent(payloadString, signature, webhookSecret);
    return event;
  } catch (error) {
    logger.error('Webhook signature verification failed', {
      error: error.message,
    });
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  retrievePaymentIntent,
  confirmPaymentIntent,
  cancelPaymentIntent,
  createRefund,
  verifyWebhookSignature,
};

