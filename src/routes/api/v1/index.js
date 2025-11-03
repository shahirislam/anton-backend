const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));
router.use('/user', require('./user'));

router.use('/competitions', require('./public/competitions'));
router.use('/categories', require('./public/categories'));
router.use('/results', require('./public/results'));
router.use('/faq', require('./public/faq'));
router.use('/terms', require('./public/terms'));
router.use('/help-support', require('./public/helpSupport'));
router.use('/points', require('./public/points'));

module.exports = router;

