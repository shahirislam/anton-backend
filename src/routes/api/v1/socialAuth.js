const express = require('express');
const router = express.Router();
const socialAuthController = require('../../../controllers/socialAuthController');
const authMiddleware = require('../../../middleware/authMiddleware');
const validate = require('../../../middleware/joiValidator');

// Google OAuth routes
router.get('/google', socialAuthController.googleAuth);
router.get('/google/callback', socialAuthController.googleCallback);
// Google Sign-In for mobile (uses idToken from Google Sign-In SDK)
router.post('/google/mobile', validate(socialAuthController.googleAuthMobileValidation), socialAuthController.googleAuthMobile);

// Apple Sign In route (POST - receives idToken from client)
router.post('/apple', validate(socialAuthController.appleAuthValidation), socialAuthController.appleAuth);

// Instagram OAuth routes
router.get('/instagram', socialAuthController.instagramAuth);
router.get('/instagram/callback', socialAuthController.instagramCallback);

// Account linking routes (require authentication)
router.post('/link', authMiddleware, validate(socialAuthController.linkAccountValidation), socialAuthController.linkAccount);
router.post('/unlink', authMiddleware, validate(socialAuthController.unlinkAccountValidation), socialAuthController.unlinkAccount);

module.exports = router;

