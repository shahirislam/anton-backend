const Joi = require('joi');
const crypto = require('crypto');
const socialAuthService = require('../services/socialAuthService');
const { getGoogleAuthUrl, getInstagramAuthUrl, isProviderEnabled, oauthConfig } = require('../config/oauth');
const logger = require('../utils/logger');

/**
 * Generate a secure random state token for CSRF protection
 */
const generateStateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Initiate Google OAuth flow
 * Redirects user to Google authorization page
 */
const googleAuth = async (req, res) => {
  try {
    if (!isProviderEnabled('google')) {
      return res.error('Google authentication is not enabled', 503);
    }

    // Generate state token for CSRF protection
    const state = generateStateToken();
    
    // Store state in session or return to client for verification
    // For stateless API, we'll return state in response and client should send it back
    const authUrl = getGoogleAuthUrl(state);

    res.success('Google OAuth URL generated', {
      authUrl,
      state, // Client should store and verify this
    });
  } catch (error) {
    logger.error('Google auth initiation error', {
      error: error.message,
      stack: error.stack,
    });
    res.error('Failed to initiate Google authentication', 500);
  }
};

/**
 * Handle Google OAuth callback
 * Receives authorization code and exchanges for tokens
 */
const googleCallback = async (req, res) => {
  try {
    if (!isProviderEnabled('google')) {
      return res.error('Google authentication is not enabled', 503);
    }

    const { code, state } = req.query;

    if (!code) {
      return res.error('Authorization code is required', 400);
    }

    // In production, verify state token here
    // const isValidState = verifyStateToken(state);
    // if (!isValidState) {
    //   return res.error('Invalid state token', 400);
    // }

    const result = await socialAuthService.authenticateGoogle(code);

    // Redirect to frontend with tokens
    // In production, use secure httpOnly cookies or return tokens in response
    const redirectUrl = `${oauthConfig.frontendUrl}/auth/callback?token=${result.accessToken}&refreshToken=${result.refreshToken}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Google callback error', {
      error: error.message,
      stack: error.stack,
    });
    const errorUrl = `${oauthConfig.frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
  }
};

/**
 * Handle Apple Sign In
 * Receives idToken from client (POST request)
 */
const appleAuth = async (req, res) => {
  try {
    if (!isProviderEnabled('apple')) {
      return res.error('Apple authentication is not enabled', 503);
    }

    const { idToken, user } = req.body;

    if (!idToken) {
      return res.error('Apple idToken is required', 400);
    }

    const result = await socialAuthService.authenticateApple(idToken, user);

    res.success('Apple authentication successful', result);
  } catch (error) {
    logger.error('Apple auth error', {
      error: error.message,
      stack: error.stack,
    });
    
    if (error.message.includes('authentication failed')) {
      return res.error('Apple authentication failed. Please try again.', 401);
    }
    
    res.error(error.message || 'Apple authentication failed', 500);
  }
};

/**
 * Initiate Instagram OAuth flow
 * Redirects user to Instagram authorization page
 */
const instagramAuth = async (req, res) => {
  try {
    if (!isProviderEnabled('instagram')) {
      return res.error('Instagram authentication is not enabled', 503);
    }

    // Generate state token for CSRF protection
    const state = generateStateToken();
    const authUrl = getInstagramAuthUrl(state);

    res.success('Instagram OAuth URL generated', {
      authUrl,
      state, // Client should store and verify this
    });
  } catch (error) {
    logger.error('Instagram auth initiation error', {
      error: error.message,
      stack: error.stack,
    });
    res.error('Failed to initiate Instagram authentication', 500);
  }
};

/**
 * Handle Instagram OAuth callback
 * Receives authorization code and exchanges for tokens
 */
const instagramCallback = async (req, res) => {
  try {
    if (!isProviderEnabled('instagram')) {
      return res.error('Instagram authentication is not enabled', 503);
    }

    const { code, state } = req.query;

    if (!code) {
      return res.error('Authorization code is required', 400);
    }

    // In production, verify state token here
    // const isValidState = verifyStateToken(state);
    // if (!isValidState) {
    //   return res.error('Invalid state token', 400);
    // }

    const result = await socialAuthService.authenticateInstagram(code);

    // Redirect to frontend with tokens
    const redirectUrl = `${oauthConfig.frontendUrl}/auth/callback?token=${result.accessToken}&refreshToken=${result.refreshToken}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Instagram callback error', {
      error: error.message,
      stack: error.stack,
    });
    const errorUrl = `${oauthConfig.frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
  }
};

/**
 * Link a social account to existing user
 * Requires authentication
 */
const linkAccount = async (req, res) => {
  try {
    const { provider, code, idToken, user: appleUser } = req.body;
    const userId = req.user._id;

    if (!provider || !['google', 'apple', 'instagram'].includes(provider)) {
      return res.error('Valid provider is required (google, apple, instagram)', 400);
    }

    let profile;

    if (provider === 'google' && code) {
      profile = await socialAuthService.getGoogleProfile(code);
    } else if (provider === 'apple' && idToken) {
      profile = await socialAuthService.getAppleProfile(idToken, appleUser);
    } else if (provider === 'instagram' && code) {
      profile = await socialAuthService.getInstagramProfile(code);
    } else {
      return res.error(`${provider} authorization code or token is required`, 400);
    }

    const linkResult = await socialAuthService.linkSocialAccount(userId, provider, profile);

    res.success(linkResult.message, linkResult);
  } catch (error) {
    logger.error('Link account error', {
      error: error.message,
      userId: req.user._id,
      provider: req.body.provider,
    });

    if (error.message.includes('already linked')) {
      return res.error(error.message, 409);
    }

    res.error(error.message || 'Failed to link account', 500);
  }
};

/**
 * Unlink a social account from user
 * Requires authentication
 */
const unlinkAccount = async (req, res) => {
  try {
    const { provider } = req.body;
    const userId = req.user._id;

    if (!provider || !['google', 'apple', 'instagram'].includes(provider)) {
      return res.error('Valid provider is required (google, apple, instagram)', 400);
    }

    const result = await socialAuthService.unlinkSocialAccount(userId, provider);

    res.success(result.message, result);
  } catch (error) {
    logger.error('Unlink account error', {
      error: error.message,
      userId: req.user._id,
      provider: req.body.provider,
    });

    if (error.message.includes('Cannot unlink')) {
      return res.error(error.message, 400);
    }

    res.error(error.message || 'Failed to unlink account', 500);
  }
};

// Validation schemas
const appleAuthValidation = Joi.object({
  idToken: Joi.string().required().messages({
    'string.empty': 'Apple idToken is required',
    'any.required': 'Apple idToken is required',
  }),
  user: Joi.object({
    email: Joi.string().email().optional(),
    name: Joi.object({
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
    }).optional(),
  }).optional(),
});

const linkAccountValidation = Joi.object({
  provider: Joi.string().valid('google', 'apple', 'instagram').required().messages({
    'any.only': 'Provider must be one of: google, apple, instagram',
    'any.required': 'Provider is required',
  }),
  code: Joi.string().when('provider', {
    is: Joi.string().valid('google', 'instagram'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  idToken: Joi.string().when('provider', {
    is: 'apple',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  user: Joi.object().optional(),
});

const unlinkAccountValidation = Joi.object({
  provider: Joi.string().valid('google', 'apple', 'instagram').required().messages({
    'any.only': 'Provider must be one of: google, apple, instagram',
    'any.required': 'Provider is required',
  }),
});

module.exports = {
  googleAuth,
  googleCallback,
  appleAuth,
  instagramAuth,
  instagramCallback,
  linkAccount,
  unlinkAccount,
  appleAuthValidation,
  linkAccountValidation,
  unlinkAccountValidation,
};

