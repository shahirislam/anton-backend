const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    user_id: {
      type: String,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    payment_intent_id: {
      type: String,
      required: [true, 'Payment Intent ID is required'],
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'usd',
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'completed', 'failed', 'canceled', 'refunded'],
      default: 'pending',
      index: true,
    },
    transaction_id: {
      type: String,
      default: null,
      index: true,
    },
    refund_reason: {
      type: String,
      default: null,
    },
    failure_reason: {
      type: String,
      default: null,
    },
    refunded_at: {
      type: Date,
      default: null,
    },
    refund_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    provider_transaction_id: {
      type: String,
      default: null,
    },
    payment_type: {
      type: String,
      enum: ['single_purchase', 'cart_checkout'],
      required: true,
    },
    // For single purchase
    competition_id: {
      type: String,
      ref: 'Competition',
    },
    quantity: {
      type: Number,
      min: 1,
    },
    // For cart checkout
    cart_items: [
      {
        competition_id: {
          type: String,
          ref: 'Competition',
        },
        quantity: {
          type: Number,
          min: 1,
        },
      },
    ],
    points_redeemed: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tickets_created: {
      type: Boolean,
      default: false,
    },
    ticket_ids: [
      {
        type: String,
        ref: 'Ticket',
      },
    ],
    metadata: {
      type: Map,
      of: String,
    },
    stripe_response: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
paymentSchema.index({ user_id: 1, status: 1 });
paymentSchema.index({ payment_intent_id: 1 });
paymentSchema.index({ created_at: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

