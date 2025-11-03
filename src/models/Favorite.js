const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const favoriteSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only favorite a competition once
favoriteSchema.index({ user_id: 1, competition_id: 1 }, { unique: true });

// Indexes for performance
favoriteSchema.index({ user_id: 1 });
favoriteSchema.index({ competition_id: 1 });

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;

