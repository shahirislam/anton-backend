const mongoose = require('mongoose');

const helpSupportSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    website: {
      type: String,
      required: [true, 'Website is required'],
      trim: true,
    },
    office_address: {
      type: String,
      required: [true, 'Office address is required'],
      trim: true,
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
helpSupportSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  
  if (!settings) {
    // Create default settings if none exist
    settings = new this({
      phone: '+1 (555) 123-4567',
      email: 'support@tmgcompetitions.com',
      website: 'https://www.tmgcompetitions.com',
      office_address: '123 Main Street, City, State 12345',
    });
    await settings.save();
  }
  
  return settings;
};

const HelpSupport = mongoose.model('HelpSupport', helpSupportSchema);

module.exports = HelpSupport;

