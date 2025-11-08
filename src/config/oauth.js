/**
 * OAuth Configuration
 * Centralized configuration for all OAuth providers
 */

const fs = require('fs');
const logger = require('../utils/logger');

const oauthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    userInfoURL: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['profile', 'email'],
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY || (process.env.APPLE_PRIVATE_KEY_PATH ? fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH, 'utf8') : null),
    redirectUri: process.env.APPLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/v1/auth/apple/callback`,
  },
  instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/instagram/callback`,
    authorizationURL: 'https://api.instagram.com/oauth/authorize',
    tokenURL: 'https://api.instagram.com/oauth/access_token',
    userInfoURL: 'https://graph.instagram.com/me',
    scopes: ['user_profile', 'user_media'],
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

/**
 * Validate OAuth configuration
 * Checks if required environment variables are set for enabled providers
 */
const validateOAuthConfig = () => {
  const errors = [];

  // Google OAuth validation
  if (process.env.ENABLE_GOOGLE_AUTH !== 'false') {
    if (!oauthConfig.google.clientId) {
      errors.push('GOOGLE_CLIENT_ID is required');
    }
    if (!oauthConfig.google.clientSecret) {
      errors.push('GOOGLE_CLIENT_SECRET is required');
    }
  }

  // Apple Sign In validation
  if (process.env.ENABLE_APPLE_AUTH !== 'false') {
    if (!oauthConfig.apple.clientId) {
      errors.push('APPLE_CLIENT_ID is required');
    }
    if (!oauthConfig.apple.teamId) {
      errors.push('APPLE_TEAM_ID is required');
    }
    if (!oauthConfig.apple.keyId) {
      errors.push('APPLE_KEY_ID is required');
    }
    if (!oauthConfig.apple.privateKey) {
      errors.push('APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH is required');
    }
  }

  // Instagram OAuth validation
  if (process.env.ENABLE_INSTAGRAM_AUTH !== 'false') {
    if (!oauthConfig.instagram.clientId) {
      errors.push('INSTAGRAM_CLIENT_ID is required');
    }
    if (!oauthConfig.instagram.clientSecret) {
      errors.push('INSTAGRAM_CLIENT_SECRET is required');
    }
  }

  if (errors.length > 0) {
    logger.warn('OAuth configuration warnings:', errors);
    // Don't throw error, just log warnings - allows partial OAuth setup
  }

  return errors.length === 0;
};

/**
 * Check if a provider is enabled
 */
const isProviderEnabled = (provider) => {
  const envKey = `ENABLE_${provider.toUpperCase()}_AUTH`;
  return process.env[envKey] !== 'false';
};

/**
 * Generate Google OAuth authorization URL
 */
const getGoogleAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: oauthConfig.google.clientId,
    redirect_uri: oauthConfig.google.redirectUri,
    response_type: 'code',
    scope: oauthConfig.google.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  if (state) {
    params.append('state', state);
  }

  return `${oauthConfig.google.authorizationURL}?${params.toString()}`;
};

/**
 * Generate Instagram OAuth authorization URL
 */
const getInstagramAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: oauthConfig.instagram.clientId,
    redirect_uri: oauthConfig.instagram.redirectUri,
    scope: oauthConfig.instagram.scopes.join(','),
    response_type: 'code',
  });

  if (state) {
    params.append('state', state);
  }

  return `${oauthConfig.instagram.authorizationURL}?${params.toString()}`;
};

module.exports = {
  oauthConfig,
  validateOAuthConfig,
  isProviderEnabled,
  getGoogleAuthUrl,
  getInstagramAuthUrl,
};

