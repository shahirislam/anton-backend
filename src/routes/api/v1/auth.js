const express = require('express');
const router = express.Router();
const authController = require('../../../controllers/authController');
const authMiddleware = require('../../../middleware/authMiddleware');
const { authLimiter, sensitiveActionLimiter } = require('../../../middleware/rateLimiter');
const validate = require('../../../middleware/joiValidator');

router.post('/register', authLimiter, validate(authController.registerValidation), authController.register);
router.post('/login', authLimiter, validate(authController.loginValidation), authController.login);
router.post('/request-otp', sensitiveActionLimiter, validate(authController.otpValidation), authController.requestOTP);
router.post('/verify-otp', authLimiter, validate(authController.verifyOtpValidation), authController.verifyOTP);
router.post('/forgot-password', sensitiveActionLimiter, validate(authController.forgotPasswordValidation), authController.forgotPassword);
router.post('/reset-password', sensitiveActionLimiter, validate(authController.resetPasswordValidation), authController.resetPassword);
router.post('/logout', authMiddleware, authController.logout);

// Social authentication routes
router.use('/', require('./socialAuth'));

module.exports = router;

