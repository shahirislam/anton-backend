const express = require('express');
const router = express.Router();
const paymentController = require('../../../controllers/paymentController');
const authMiddleware = require('../../../middleware/authMiddleware');
const validate = require('../../../middleware/joiValidator');
const Joi = require('joi');

// Validation schemas
const singlePurchaseValidation = Joi.object({
  competition_id: Joi.string().required().messages({
    'string.empty': 'Competition ID is required',
    'any.required': 'Competition ID is required',
  }),
  quantity: Joi.number().integer().min(1).optional().messages({
    'number.min': 'Quantity must be at least 1',
    'number.base': 'Quantity must be a number',
  }),
});

const checkoutValidation = Joi.object({
  points_to_redeem: Joi.number().integer().min(0).optional().messages({
    'number.min': 'Points to redeem must be 0 or greater',
    'number.base': 'Points to redeem must be a number',
  }),
});

// Routes
router.post(
  '/create-intent/single',
  authMiddleware,
  validate(singlePurchaseValidation),
  paymentController.createSinglePurchaseIntent
);

router.post(
  '/create-intent/checkout',
  authMiddleware,
  validate(checkoutValidation),
  paymentController.createCheckoutIntent
);

router.get(
  '/status/:payment_intent_id',
  authMiddleware,
  paymentController.getPaymentStatus
);

// Webhook endpoint (no auth, uses Stripe signature verification)
// Note: Raw body is handled in app.js before JSON middleware
router.post(
  '/webhook',
  paymentController.handleWebhook
);

module.exports = router;

