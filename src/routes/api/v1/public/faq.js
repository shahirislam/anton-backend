const express = require('express');
const router = express.Router();
const faqController = require('../../../controllers/faqController');

router.get('/', faqController.getActiveFAQs);

module.exports = router;

