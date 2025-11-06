const express = require('express');
const router = express.Router();
const cartController = require('../../../../controllers/cartController');
const authMiddleware = require('../../../../middleware/authMiddleware');
const validateId = require('../../../../middleware/validateId');
const validate = require('../../../../middleware/joiValidator');
const Joi = require('joi');

const addToCartValidation = Joi.object({
  competition_id: Joi.string().required().messages({
    'string.empty': 'Competition ID is required',
    'any.required': 'Competition ID is required',
  }),
  quantity: Joi.number().integer().min(1).optional().default(1).messages({
    'number.min': 'Quantity must be at least 1',
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
  }),
});

const updateCartItemValidation = Joi.object({
  quantity: Joi.number().integer().min(1).required().messages({
    'number.min': 'Quantity must be at least 1',
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'any.required': 'Quantity is required',
  }),
});

router.post('/', authMiddleware, validate(addToCartValidation), cartController.addToCart);
router.get('/', authMiddleware, cartController.getCart);
router.delete('/clear', authMiddleware, cartController.clearCart);
router.put('/:id', authMiddleware, validateId(), validate(updateCartItemValidation), cartController.updateCartItem);
router.delete('/:id', authMiddleware, validateId(), cartController.removeFromCart);

module.exports = router;

