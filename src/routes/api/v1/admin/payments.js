const express = require('express');
const router = express.Router();
const adminPaymentController = require('../../../../controllers/admin/adminPaymentController');
const validateId = require('../../../../middleware/validateId');
const validate = require('../../../../middleware/joiValidator');

// Payment statistics
router.get('/stats', adminPaymentController.getPaymentStats);

// Get all payments
router.get('/', adminPaymentController.getPayments);

// Get payment by ID
router.get('/:id', validateId(), adminPaymentController.getPaymentById);

// Refund payment
router.put(
  '/:id/refund',
  validateId(),
  validate(adminPaymentController.refundValidation),
  adminPaymentController.refundPayment
);

// Retry failed payment
router.put(
  '/:id/retry',
  validateId(),
  validate(adminPaymentController.retryValidation),
  adminPaymentController.retryPayment
);

module.exports = router;

