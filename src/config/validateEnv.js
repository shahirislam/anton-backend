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
};

module.exports = validateEnv;

