const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const cartSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    user_id: {
      type: String,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    competition_id: {
      type: String,
      ref: 'Competition',
      required: [true, 'Competition ID is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint: one cart item per user per competition
cartSchema.index({ user_id: 1, competition_id: 1 }, { unique: true });
cartSchema.index({ user_id: 1 });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;

