const express = require('express');
const router = express.Router();
const socialAuthController = require('../../../controllers/socialAuthController');
const authMiddleware = require('../../../middleware/authMiddleware');
const { authLimiter } = require('../../../middleware/rateLimiter');
const validate = require('../../../middleware/joiValidator');

// Google OAuth routes
router.get('/google', authLimiter, socialAuthController.googleAuth);
router.get('/google/callback', authLimiter, socialAuthController.googleCallback);
// Google Sign-In for mobile (uses idToken from Google Sign-In SDK)
router.post('/google/mobile', authLimiter, validate(socialAuthController.googleAuthMobileValidation), socialAuthController.googleAuthMobile);

// Apple Sign In route (POST - receives idToken from client)
router.post('/apple', authLimiter, validate(socialAuthController.appleAuthValidation), socialAuthController.appleAuth);

// Instagram OAuth routes
router.get('/instagram', authLimiter, socialAuthController.instagramAuth);
router.get('/instagram/callback', authLimiter, socialAuthController.instagramCallback);

// Account linking routes (require authentication)
router.post('/link', authMiddleware, authLimiter, validate(socialAuthController.linkAccountValidation), socialAuthController.linkAccount);
router.post('/unlink', authMiddleware, authLimiter, validate(socialAuthController.unlinkAccountValidation), socialAuthController.unlinkAccount);

module.exports = router;

