const Notification = require('../../models/Notification');
const Joi = require('joi');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');

const createNotification = async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();

    res.success('Notification created successfully', { notification }, 201);
  } catch (error) {
    res.error(error.message || 'Failed to create notification', 500);
  }
};

const getNotifications = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const notifications = await Notification.find()
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments();

    res.success('Notifications retrieved successfully', {
      notifications,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve notifications', 500);
  }
};

const notificationValidation = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'Title is required',
    'any.required': 'Title is required',
  }),
  message: Joi.string().trim().required().messages({
    'string.empty': 'Message is required',
    'any.required': 'Message is required',
  }),
  type: Joi.string().valid('competition_updates', 'winner_announcements', 'new_competitions', 'live_updates', 'system_update').required().messages({
    'any.only': 'Invalid notification type',
    'any.required': 'Type is required',
  }),
  user_id: Joi.string().optional(),
});

module.exports = {
  createNotification,
  getNotifications,
  notificationValidation,
};

