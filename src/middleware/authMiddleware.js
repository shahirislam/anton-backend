const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Verifies access token and attaches user to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.error('Authentication required. Please provide a valid token.', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.error('Authentication token is required', 401);
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password -otp -otp_expires_at');
      
      if (!user) {
        return res.error('User not found', 404);
      }

      // Social auth users are auto-verified, skip verification check for them
      // Local auth users must verify their email
      if (!user.verified && user.authProvider === 'local') {
        return res.error('Please verify your email address first', 403);
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return res.error('Token has expired. Please login again.', 401);
      }
      if (tokenError.name === 'JsonWebTokenError') {
        return res.error('Invalid token. Please login again.', 401);
      }
      throw tokenError;
    }
  } catch (error) {
    logger.error('Auth middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });
    return res.error('Authentication failed', 401);
  }
};

module.exports = authMiddleware;

