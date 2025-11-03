const express = require('express');
const router = express.Router();
const adminNotificationController = require('../../../../controllers/admin/adminNotificationController');
const validate = require('../../../../middleware/joiValidator');

router.post('/', validate(adminNotificationController.notificationValidation), adminNotificationController.createNotification);
router.get('/', adminNotificationController.getNotifications);

module.exports = router;

