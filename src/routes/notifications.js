const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const validateId = require('../middleware/validateId');

router.get('/', authMiddleware, notificationController.getNotifications);
router.patch('/:id/read', authMiddleware, validateId(), notificationController.markAsRead);

module.exports = router;

