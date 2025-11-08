/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 */

const logger = require('../utils/logger');

const requiredEnvVars = [
  {
    name: 'MONGO_URI',
    description: 'MongoDB connection string',
    example: 'mongodb://localhost:27017/tmg_competitions',
  },
  {
    name: 'JWT_SECRET',
    description: 'Secret key for JWT access token signing',
    example: 'your-super-secret-jwt-key-min-32-chars',
  },
  {
    name: 'JWT_REFRESH_SECRET',
    description: 'Secret key for JWT refresh token signing',
    example: 'your-super-secret-refresh-key-min-32-chars',
  },
];

const validateEnv = () => {
  const missing = [];
  const invalid = [];

  requiredEnvVars.forEach(({ name, description }) => {
    const value = process.env[name];

    if (!value || value.trim() === '') {
      missing.push({ name, description });
      return;
    }

    if (name === 'JWT_SECRET' || name === 'JWT_REFRESH_SECRET') {
      if (value.length < 32) {
        invalid.push({
          name,
          description,
          issue: 'Must be at least 32 characters long for security',
        });
      }
    }

    if (name === 'MONGO_URI') {
      if (!value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
        invalid.push({
          name,
          description,
          issue: 'Must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)',
        });
      }
    }
  });

  if (missing.length > 0 || invalid.length > 0) {
    const errorNames = [
      ...missing.map(({ name }) => name),
      ...invalid.map(({ name }) => name),
    ].join(', ');
    
    logger.error(`Missing or invalid environment variables: ${errorNames}. See README.md for setup.`);
    process.exit(1);
  }

  // Validate OAuth configuration if providers are enabled
  validateOAuthEnv();
};

/**
 * Validate OAuth environment variables conditionally
 * Only validates if provider is enabled (not explicitly disabled)
 */
const validateOAuthEnv = () => {
  const warnings = [];

  // Google OAuth validation
  if (process.env.ENABLE_GOOGLE_AUTH !== 'false') {
    if (!process.env.GOOGLE_CLIENT_ID) {
      warnings.push('GOOGLE_CLIENT_ID is missing (Google OAuth may not work)');
    }
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      warnings.push('GOOGLE_CLIENT_SECRET is missing (Google OAuth may not work)');
    }
  }

  // Apple Sign In validation
  if (process.env.ENABLE_APPLE_AUTH !== 'false') {
    if (!process.env.APPLE_CLIENT_ID) {
      warnings.push('APPLE_CLIENT_ID is missing (Apple Sign In may not work)');
    }
    if (!process.env.APPLE_TEAM_ID) {
      warnings.push('APPLE_TEAM_ID is missing (Apple Sign In may not work)');
    }
    if (!process.env.APPLE_KEY_ID) {
      warnings.push('APPLE_KEY_ID is missing (Apple Sign In may not work)');
    }
    if (!process.env.APPLE_PRIVATE_KEY && !process.env.APPLE_PRIVATE_KEY_PATH) {
      warnings.push('APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH is missing (Apple Sign In may not work)');
    }
  }

  // Instagram OAuth validation
  if (process.env.ENABLE_INSTAGRAM_AUTH !== 'false') {
    if (!process.env.INSTAGRAM_CLIENT_ID) {
      warnings.push('INSTAGRAM_CLIENT_ID is missing (Instagram OAuth may not work)');
    }
    if (!process.env.INSTAGRAM_CLIENT_SECRET) {
      warnings.push('INSTAGRAM_CLIENT_SECRET is missing (Instagram OAuth may not work)');
    }
  }

  // Frontend URL (optional but recommended)
  if (!process.env.FRONTEND_URL) {
    warnings.push('FRONTEND_URL is not set (using default: http://localhost:3000)');
  }

  // Stripe webhook secret (optional for development, required for production)
  if (!process.env.STRIPE_WEBHOOK_SECRET && process.env.NODE_ENV === 'production') {
    warnings.push('STRIPE_WEBHOOK_SECRET is not set (webhooks will not work in production)');
  }

  if (warnings.length > 0) {
    logger.warn('Configuration warnings:', warnings);
  }
};

module.exports = validateEnv;

