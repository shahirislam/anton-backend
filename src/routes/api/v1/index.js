const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));
// One-time admin creation endpoint (public, but requires secret key)
router.use('/setup', require('./admin/createAdmin'));
router.use('/user', require('./user'));

router.use('/competitions', require('./public/competitions'));
router.use('/categories', require('./public/categories'));
router.use('/results', require('./public/results'));
router.use('/faq', require('./public/faq'));
router.use('/terms', require('./public/terms'));
router.use('/help-support', require('./public/helpSupport'));
router.use('/points', require('./public/points'));
router.use('/tickets', require('./public/tickets'));

module.exports = router;

