const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const faqSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

faqSchema.index({ order: 1 });
faqSchema.index({ is_active: 1 });

const FAQ = mongoose.model('FAQ', faqSchema);

module.exports = FAQ;

