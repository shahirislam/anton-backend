const Notification = require('../../models/Notification');
const { body, validationResult } = require('express-validator');
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

const notificationValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('type').isIn(['new_competition', 'winner', 'system_update']).withMessage('Invalid notification type'),
  body('user_id').optional().isString(),
];

module.exports = {
  createNotification,
  getNotifications,
  notificationValidation,
};

