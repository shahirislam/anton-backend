const Notification = require('../models/Notification');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit, skip } = getPaginationParams(req);

    const notifications = await Notification.find({
      $or: [{ user_id: userId }, { user_id: null }], // User-specific or broadcast
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({
      $or: [{ user_id: userId }, { user_id: null }],
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

module.exports = {
  getNotifications,
  markAsRead,
};

