const rateLimit = require('express-rate-limit');

const rateLimitHandler = (req, res, next, options) => {
  res.status(429).json({
    success: false,
    message: options.message,
  });
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: 'Too many authentication attempts. Please try again later.',
  handler: rateLimitHandler,
  standardHeaders: true, 
  legacyHeaders: false,
  skipSuccessfulRequests: false, 
});

const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 3, 
  message: 'Too many attempts. Please wait before requesting again.',
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many requests. Please slow down.',
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

module.exports = {
  authLimiter,
  sensitiveActionLimiter,
  generalLimiter,
};

