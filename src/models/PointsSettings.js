const mongoose = require('mongoose');

const pointsSettingsSchema = new mongoose.Schema(
  {
    points_per_dollar: {
      type: Number,
      required: [true, 'Points per dollar is required'],
      min: [0.01, 'Points per dollar must be greater than 0'],
      default: 10, // Default: 10 points per $1.00 (10% cashback with $1 = 100 points base)
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

// Ensure only one settings document exists
pointsSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  
  if (!settings) {
    // Create default settings if none exist
    settings = new this({
      points_per_dollar: 10,
      is_active: true,
    });
    await settings.save();
  }
  
  return settings;
};

const PointsSettings = mongoose.model('PointsSettings', pointsSettingsSchema);

module.exports = PointsSettings;

