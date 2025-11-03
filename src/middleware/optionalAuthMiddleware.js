const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Optional JWT Authentication Middleware
 * Verifies access token if provided and attaches user to request
 * Does not fail if token is missing or invalid
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password -otp -otp_expires_at');
      
      if (user && user.verified) {
        // Attach user to request only if verified
        req.user = user;
      }
      
      next();
    } catch (tokenError) {
      // Token invalid or expired, but continue without authentication
      next();
    }
  } catch (error) {
    // Log error but continue without authentication
    logger.error('Optional auth middleware error', {
      error: error.message,
      path: req.path,
      method: req.method,
    });
    next();
  }
};

module.exports = optionalAuthMiddleware;

