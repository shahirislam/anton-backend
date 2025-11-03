const Notification = require('../models/Notification');
const NotificationPreferences = require('../models/NotificationPreferences');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit, skip } = getPaginationParams(req);

    // Get user's notification preferences
    const preferences = await NotificationPreferences.getPreferences(userId);
    
    // Build query to filter notifications based on preferences
    const typeQuery = [];
    
    if (preferences.competition_updates) typeQuery.push('competition_updates');
    if (preferences.winner_announcements) typeQuery.push('winner_announcements');
    if (preferences.new_competitions) typeQuery.push('new_competitions');
    if (preferences.live_updates) typeQuery.push('live_updates');
    if (preferences.system_update) typeQuery.push('system_update');

    const notifications = await Notification.find({
      $or: [
        { user_id: userId }, // User-specific notifications (always shown)
        { 
          user_id: null, // Broadcast notifications
          type: { $in: typeQuery } // Only types user has enabled
        }
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({
      $or: [
        { user_id: userId },
        { 
          user_id: null,
          type: { $in: typeQuery }
        }
      ],
    });

    res.success('Notifications retrieved successfully', {
      notifications,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve notifications', 500);
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      $or: [{ user_id: userId }, { user_id: null }],
    });

    if (!notification) {
      return res.error('Notification not found', 404);
    }

    notification.is_read = true;
    await notification.save();

    res.success('Notification marked as read');
  } catch (error) {
    res.error(error.message || 'Failed to update notification', 500);
  }
};

const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user._id;

    const preferences = await NotificationPreferences.getPreferences(userId);

    res.success('Notification preferences retrieved successfully', {
      preferences: {
        competition_updates: preferences.competition_updates,
        winner_announcements: preferences.winner_announcements,
        new_competitions: preferences.new_competitions,
        live_updates: preferences.live_updates,
        system_update: preferences.system_update,
      },
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve notification preferences', 500);
  }
};

const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      competition_updates, 
      winner_announcements, 
      new_competitions, 
      live_updates,
      system_update 
    } = req.body;

    let preferences = await NotificationPreferences.findOne({ user_id: userId });

    if (!preferences) {
      preferences = new NotificationPreferences({
        user_id: userId,
        competition_updates: competition_updates !== undefined ? competition_updates : true,
        winner_announcements: winner_announcements !== undefined ? winner_announcements : true,
        new_competitions: new_competitions !== undefined ? new_competitions : true,
        live_updates: live_updates !== undefined ? live_updates : true,
        system_update: system_update !== undefined ? system_update : true,
      });
    } else {
      if (competition_updates !== undefined) preferences.competition_updates = competition_updates;
      if (winner_announcements !== undefined) preferences.winner_announcements = winner_announcements;
      if (new_competitions !== undefined) preferences.new_competitions = new_competitions;
      if (live_updates !== undefined) preferences.live_updates = live_updates;
      if (system_update !== undefined) preferences.system_update = system_update;
    }

    await preferences.save();

    res.success('Notification preferences updated successfully', {
      preferences: {
        competition_updates: preferences.competition_updates,
        winner_announcements: preferences.winner_announcements,
        new_competitions: preferences.new_competitions,
        live_updates: preferences.live_updates,
        system_update: preferences.system_update,
      },
    });
  } catch (error) {
    res.error(error.message || 'Failed to update notification preferences', 500);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
};

