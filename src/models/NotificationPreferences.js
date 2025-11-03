const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const notificationPreferencesSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    user_id: {
      type: String,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },
    competition_updates: {
      type: Boolean,
      default: true,
    },
    winner_announcements: {
      type: Boolean,
      default: true,
    },
    new_competitions: {
      type: Boolean,
      default: true,
    },
    live_updates: {
      type: Boolean,
      default: true,
    },
    system_update: {
      type: Boolean,
      default: true, 
    },
  },
  {
    timestamps: true,
  }
);

// Index is already created by unique: true in the user_id field definition above

notificationPreferencesSchema.statics.getPreferences = async function (userId) {
  let preferences = await this.findOne({ user_id: userId });
  
  if (!preferences) {
    preferences = new this({
      user_id: userId,
      competition_updates: true,
      winner_announcements: true,
      new_competitions: true,
      live_updates: true,
      system_update: true,
    });
    await preferences.save();
  }
  
  return preferences;
};

const NotificationPreferences = mongoose.model('NotificationPreferences', notificationPreferencesSchema);

module.exports = NotificationPreferences;

