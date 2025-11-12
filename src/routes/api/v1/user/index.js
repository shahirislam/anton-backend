const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../../middleware/authMiddleware');

router.use(authMiddleware);

router.use('/profile', require('./profile'));
router.use('/tickets', require('./tickets'));
router.use('/cart', require('./cart'));
router.use('/points', require('./points'));
router.use('/notifications', require('./notifications'));
router.use('/device-token', require('./deviceToken'));

module.exports = router;

