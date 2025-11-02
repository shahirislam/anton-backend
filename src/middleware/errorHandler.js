const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
    path: req.path,
    method: req.method,
  });

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));
    return res.error('Validation failed', 400, errors);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.error(`${field} already exists`, 409);
  }

  if (err.name === 'CastError') {
    return res.error('Invalid ID format', 400);
  }

  if (err.name === 'JsonWebTokenError') {
    return res.error('Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return res.error('Token expired', 401);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.error(message, statusCode);
};

module.exports = errorHandler;

