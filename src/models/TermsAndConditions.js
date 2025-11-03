const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const termsAndConditionsSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
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

// Ensure only one active version exists
termsAndConditionsSchema.pre('save', async function (next) {
  if (this.is_active && this.isNew) {
    // When creating a new active version, deactivate all others
    await mongoose.model('TermsAndConditions').updateMany(
      { _id: { $ne: this._id } },
      { is_active: false }
    );
  }
  next();
});

termsAndConditionsSchema.index({ is_active: 1 });
termsAndConditionsSchema.index({ version: 1 });

const TermsAndConditions = mongoose.model('TermsAndConditions', termsAndConditionsSchema);

module.exports = TermsAndConditions;

