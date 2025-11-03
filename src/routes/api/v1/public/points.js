const express = require('express');
const router = express.Router();
const pointsController = require('../../../controllers/pointsController');

// Public endpoint - no authentication required
router.get('/conversion-rate', pointsController.getConversionRate);

module.exports = router;

