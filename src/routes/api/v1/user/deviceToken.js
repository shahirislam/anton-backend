const express = require('express');
const router = express.Router();
const deviceTokenController = require('../../../../controllers/deviceTokenController');
const authMiddleware = require('../../../../middleware/authMiddleware');
const validate = require('../../../../middleware/joiValidator');
const Joi = require('joi');

const deviceTokenValidation = Joi.object({
  device_token: Joi.string().required().messages({
    'string.empty': 'Device token is required',
    'any.required': 'Device token is required',
  }),
  platform: Joi.string().valid('ios', 'android').required().messages({
    'any.only': 'Platform must be either "ios" or "android"',
    'any.required': 'Platform is required',
  }),
  device_id: Joi.string().optional().allow(null, ''),
});

const removeTokenValidation = Joi.object({
  device_token: Joi.string().required().messages({
    'string.empty': 'Device token is required',
    'any.required': 'Device token is required',
  }),
});

router.post('/', authMiddleware, validate(deviceTokenValidation), deviceTokenController.registerDeviceToken);
router.delete('/', authMiddleware, validate(removeTokenValidation), deviceTokenController.removeDeviceToken);
router.get('/', authMiddleware, deviceTokenController.getDeviceTokens);

module.exports = router;

