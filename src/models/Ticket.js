const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ticketSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    ticket_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be greater than 0'],
    },
    purchase_date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'won', 'lost', 'refunded'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ user_id: 1 });
ticketSchema.index({ competition_id: 1 });
ticketSchema.index({ user_id: 1, competition_id: 1 });
ticketSchema.index({ competition_id: 1, status: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;

