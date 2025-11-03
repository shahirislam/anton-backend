const express = require('express');
const router = express.Router();
const notificationController = require('../../../controllers/notificationController');
const authMiddleware = require('../../../middleware/authMiddleware');
const validateId = require('../../../middleware/validateId');
const validate = require('../../../middleware/joiValidator');
const Joi = require('joi');

router.get('/', authMiddleware, notificationController.getNotifications);
router.patch('/:id/read', authMiddleware, validateId(), notificationController.markAsRead);

const notificationPreferencesValidation = Joi.object({
  competition_updates: Joi.boolean().optional().messages({
    'boolean.base': 'Competition updates must be a boolean',
  }),
  winner_announcements: Joi.boolean().optional().messages({
    'boolean.base': 'Winner announcements must be a boolean',
  }),
  new_competitions: Joi.boolean().optional().messages({
    'boolean.base': 'New competitions must be a boolean',
  }),
  live_updates: Joi.boolean().optional().messages({
    'boolean.base': 'Live updates must be a boolean',
  }),
  system_update: Joi.boolean().optional().messages({
    'boolean.base': 'System update must be a boolean',
  }),
});

router.get('/preferences', authMiddleware, notificationController.getNotificationPreferences);
router.put('/preferences', authMiddleware, validate(notificationPreferencesValidation), notificationController.updateNotificationPreferences);

module.exports = router;

