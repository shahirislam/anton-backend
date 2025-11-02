const { validate: isValidUUID } = require('uuid');

/**
 * Middleware to validate ID parameter format (UUID or MongoDB ObjectId)
 * @param {string} paramName 
 */
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return res.error(`${paramName} parameter is required`, 400);
    }

    if (!isValidUUID(id)) {
      return res.error(`Invalid ${paramName} format`, 400);
    }

    next();
  };
};

module.exports = validateId;

