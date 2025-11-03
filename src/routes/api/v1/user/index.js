const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/authMiddleware');

// Apply auth middleware to all user routes
router.use(authMiddleware);

// Import and use nested route modules
router.use('/profile', require('./profile'));
router.use('/tickets', require('./tickets'));
router.use('/points', require('./points'));
router.use('/notifications', require('./notifications'));

module.exports = router;

