const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/pointsController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/history', authMiddleware, pointsController.getPointsHistory);
router.get('/summary', authMiddleware, pointsController.getPointsSummary);

module.exports = router;

