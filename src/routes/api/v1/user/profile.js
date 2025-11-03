const express = require('express');
const router = express.Router();
const profileController = require('../../../controllers/profileController');
const authMiddleware = require('../../../middleware/authMiddleware');
const validate = require('../../../middleware/joiValidator');
const Joi = require('joi');

const updateProfileValidation = Joi.object({
  name: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name cannot be empty',
  }),
  email: Joi.string().email().lowercase().trim().optional().messages({
    'string.email': 'Valid email is required',
  }),
  profile_image: Joi.string().uri().optional().messages({
    'string.uri': 'Profile image must be a valid URL',
  }),
});

router.get('/', authMiddleware, profileController.getProfile);
router.put('/', authMiddleware, validate(updateProfileValidation), profileController.updateProfile);
router.get('/points', authMiddleware, profileController.getProfilePoints);
router.get('/transactions', authMiddleware, profileController.getProfileTransactions);

module.exports = router;

