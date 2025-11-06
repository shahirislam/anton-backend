const express = require('express');
const router = express.Router();
const profileController = require('../../../../controllers/profileController');
const authMiddleware = require('../../../../middleware/authMiddleware');
const validate = require('../../../../middleware/joiValidator');
const { createUploadMiddleware } = require('../../../../middleware/uploadMiddleware');
const Joi = require('joi');

const uploadProfileImage = createUploadMiddleware('profiles', 'profile_image');

const updateProfileValidation = Joi.object({
  name: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name cannot be empty',
  }),
  email: Joi.string().email().lowercase().trim().optional().messages({
    'string.email': 'Valid email is required',
  }),
  phone_number: Joi.string().trim().optional().allow('', null).messages({
    'string.base': 'Phone number must be a string',
  }),
  location: Joi.string().trim().optional().allow('', null).messages({
    'string.base': 'Location must be a string',
  }),
});

router.get('/', authMiddleware, profileController.getProfile);
router.put('/', authMiddleware, uploadProfileImage, validate(updateProfileValidation), profileController.updateProfile);
router.get('/points', authMiddleware, profileController.getProfilePoints);
router.get('/transactions', authMiddleware, profileController.getProfileTransactions);

module.exports = router;

