const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const pointsHistorySchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['earned', 'spent'],
      required: [true, 'Type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

pointsHistorySchema.index({ user_id: 1 });
pointsHistorySchema.index({ type: 1 });
pointsHistorySchema.index({ created_at: -1 });
pointsHistorySchema.index({ user_id: 1, created_at: -1 });
pointsHistorySchema.index({ user_id: 1, type: 1, created_at: -1 });

const PointsHistory = mongoose.model('PointsHistory', pointsHistorySchema);

module.exports = PointsHistory;

