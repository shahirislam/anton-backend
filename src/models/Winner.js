const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const winnerSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    competition_id: {
      type: String,
      ref: 'Competition',
      required: [true, 'Competition ID is required'],
    },
    user_id: {
      type: String,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    ticket_number: {
      type: String,
      required: [true, 'Ticket number is required'],
    },
    prize_value: {
      type: Number,
      required: [true, 'Prize value is required'],
      min: 0,
    },
    draw_video_url: {
      type: String,
      default: null,
    },
    draw_date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
winnerSchema.index({ competition_id: 1 });
winnerSchema.index({ user_id: 1 });
winnerSchema.index({ ticket_number: 1 });

const Winner = mongoose.model('Winner', winnerSchema);

module.exports = Winner;

