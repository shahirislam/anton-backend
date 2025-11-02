const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');

const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('profile_image').optional().isURL().withMessage('Profile image must be a valid URL'),
];

router.get('/', authMiddleware, profileController.getProfile);
router.put('/', authMiddleware, updateProfileValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.error('Validation failed', 400, errors.array());
  }
  next();
}, profileController.updateProfile);
router.get('/points', authMiddleware, profileController.getProfilePoints);
router.get('/transactions', authMiddleware, profileController.getProfileTransactions);

module.exports = router;

