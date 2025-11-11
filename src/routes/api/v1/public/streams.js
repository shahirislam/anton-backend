const express = require('express');
const router = express.Router();
const streamController = require('../../../../controllers/streamController');
const validateId = require('../../../../middleware/validateId');

// Get stream information as JSON (API endpoint)
router.get('/:competitionId', validateId('competitionId'), streamController.getStreamInfoJSON);

module.exports = router;

