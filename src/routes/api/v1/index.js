const express = require('express');
const router = express.Router();

// Import route modules
router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));
router.use('/user', require('./user'));
router.use('/public', require('./public'));

module.exports = router;

