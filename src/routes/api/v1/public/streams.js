const express = require('express');
const router = express.Router();
const streamController = require('../../../../controllers/streamController');
const validateId = require('../../../../middleware/validateId');

// Get stream information for viewing (public endpoint)
router.get('/:competitionId', validateId('competitionId'), streamController.getStreamInfo);

module.exports = router;

