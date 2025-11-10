const express = require('express');
const router = express.Router();

router.use('/competitions', require('./competitions'));
router.use('/categories', require('./categories'));
router.use('/results', require('./results'));
router.use('/faq', require('./faq'));
router.use('/terms', require('./terms'));
router.use('/help-support', require('./helpSupport'));
router.use('/points', require('./points'));
router.use('/tickets', require('./tickets'));
router.use('/streams', require('./streams'));

module.exports = router;

