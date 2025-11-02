const logger = require('../utils/logger');

/**
 * Admin Authorization Middleware
 * Checks if user has admin role
 * Must be used after authMiddleware
 */
const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.error('Authentication required', 401);
    }

    if (req.user.role !== 'admin') {
      return res.error('Access denied. Admin privileges required.', 403);
    }

    next();
  } catch (error) {
    logger.error('Admin middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      userId: req.user?._id,
    });
    return res.error('Authorization failed', 403);
  }
};

module.exports = isAdmin;

