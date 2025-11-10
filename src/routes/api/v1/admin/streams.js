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

module.exports = router;

