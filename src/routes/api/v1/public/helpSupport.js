const express = require('express');
const router = express.Router();
const helpSupportController = require('../../../../controllers/helpSupportController');

router.get('/', helpSupportController.getHelpSupport);

module.exports = router;

