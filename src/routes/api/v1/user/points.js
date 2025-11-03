const express = require('express');
const router = express.Router();
const pointsController = require('../../../controllers/pointsController');
const validate = require('../../../middleware/joiValidator');
const Joi = require('joi');

// All user points routes require authentication (middleware applied in user/index.js)
router.get('/history', pointsController.getPointsHistory);
router.get('/summary', pointsController.getPointsSummary);

const redeemPointsValidation = Joi.object({
  amount: Joi.number().integer().min(100).required().messages({
    'number.min': 'Redemption amount must be at least 100 points',
    'number.base': 'Amount must be a number',
    'any.required': 'Amount is required',
  }),
});

router.post('/redeem', validate(redeemPointsValidation), pointsController.redeemPoints);

module.exports = router;

