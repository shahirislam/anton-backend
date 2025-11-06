const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const termsSectionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    section_title: {
      type: String,
      required: [true, 'Section title is required'],
      trim: true,
    },
    section_content: {
      type: String,
      required: [true, 'Section content is required'],
      trim: true,
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
      min: [1, 'Order must be at least 1'],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    updated_by: {
      type: String,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique order for active sections
termsSectionSchema.index({ order: 1, is_active: 1 });
termsSectionSchema.index({ is_active: 1 });

const TermsSection = mongoose.model('TermsSection', termsSectionSchema);

module.exports = TermsSection;

