const express = require('express');
const router = express.Router();
const adminPointsController = require('../../../controllers/admin/adminPointsController');
const validate = require('../../../middleware/joiValidator');

router.post('/add', validate(adminPointsController.pointsValidation), adminPointsController.addPoints);
router.post('/deduct', validate(adminPointsController.pointsValidation), adminPointsController.deductPoints);
router.get('/settings', adminPointsController.getPointsSettings);
router.put('/settings', validate(adminPointsController.pointsSettingsValidation), adminPointsController.updatePointsSettings);

module.exports = router;

