const Joi = require('joi');

/**
 * Joi validation middleware
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Where to validate from: 'body', 'query', 'params' (default: 'body')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.error('Validation failed', 400, errors);
    }

    // Replace req[source] with validated and sanitized value
    req[source] = value;
    next();
  };
};

module.exports = validate;

