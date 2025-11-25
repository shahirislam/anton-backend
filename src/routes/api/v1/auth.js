const express = require('express');
const router = express.Router();
const authController = require('../../../controllers/authController');
const authMiddleware = require('../../../middleware/authMiddleware');
const validate = require('../../../middleware/joiValidator');

router.post('/register', validate(authController.registerValidation), authController.register);
router.post('/login', validate(authController.loginValidation), authController.login);
router.post('/request-otp', validate(authController.otpValidation), authController.requestOTP);
router.post('/verify-otp', validate(authController.verifyOtpValidation), authController.verifyOTP);
router.post('/forgot-password', validate(authController.forgotPasswordValidation), authController.forgotPassword);
router.post('/reset-password', validate(authController.resetPasswordValidation), authController.resetPassword);
router.post('/change-password', authMiddleware, validate(authController.changePasswordValidation), authController.changePassword);
router.post('/logout', authMiddleware, authController.logout);

// Social authentication routes
router.use('/', require('./socialAuth'));

module.exports = router;

