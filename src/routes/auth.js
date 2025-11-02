const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authLimiter, sensitiveActionLimiter } = require('../middleware/rateLimiter');
const validateRequest = require('../middleware/validateRequest');

router.post('/register', authLimiter, authController.registerValidation, validateRequest, authController.register);
router.post('/login', authLimiter, authController.loginValidation, validateRequest, authController.login);
router.post('/request-otp', sensitiveActionLimiter, authController.otpValidation, validateRequest, authController.requestOTP);
router.post('/verify-otp', authLimiter, authController.verifyOtpValidation, validateRequest, authController.verifyOTP);
router.post('/forgot-password', sensitiveActionLimiter, authController.forgotPasswordValidation, validateRequest, authController.forgotPassword);
router.post('/reset-password', sensitiveActionLimiter, authController.resetPasswordValidation, validateRequest, authController.resetPassword);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;

