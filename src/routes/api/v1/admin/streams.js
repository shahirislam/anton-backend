const express = require('express');
const router = express.Router();
const adminStreamController = require('../../../../controllers/admin/adminStreamController');
const validateId = require('../../../../middleware/validateId');

// Start stream for a competition
router.post('/:competitionId/start', validateId('competitionId'), adminStreamController.startStream);

// Stop stream for a competition
router.post('/:competitionId/stop', validateId('competitionId'), adminStreamController.stopStream);

// Get stream status for a competition
router.get('/:competitionId/status', validateId('competitionId'), adminStreamController.getStreamStatus);

// Set HLS stream URL for a competition
router.patch('/:competitionId/hls-url', validateId('competitionId'), adminStreamController.setHLSStreamUrl);

module.exports = router;

