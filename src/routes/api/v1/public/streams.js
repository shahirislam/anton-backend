const express = require('express');
const router = express.Router();
const streamController = require('../../../../controllers/streamController');
const validateId = require('../../../../middleware/validateId');

// Get stream information as JSON (API endpoint)
router.get('/:competitionId', validateId('competitionId'), streamController.getStreamInfoJSON);

// Get HLS stream URL for mobile players
router.get('/:competitionId/hls', validateId('competitionId'), streamController.getHLSStreamUrl);

module.exports = router;

