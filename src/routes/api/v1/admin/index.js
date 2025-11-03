const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/authMiddleware');
const isAdmin = require('../../../middleware/isAdmin');

// Apply auth and admin middleware to all admin routes
router.use(authMiddleware);
router.use(isAdmin);

// Import and use nested route modules
router.use('/competitions', require('./competitions'));
router.use('/tickets', require('./tickets'));
router.use('/results', require('./results'));
router.use('/notifications', require('./notifications'));
router.use('/points', require('./points'));
router.use('/users', require('./users'));
router.use('/categories', require('./categories'));
router.use('/faqs', require('./faqs'));
router.use('/terms', require('./terms'));
router.use('/help-support', require('./helpSupport'));
router.use('/dashboard', require('./dashboard'));

module.exports = router;

