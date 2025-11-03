const express = require('express');
const router = express.Router();
const ticketController = require('../../../controllers/ticketController');
const authMiddleware = require('../../../middleware/authMiddleware');
const validateId = require('../../../middleware/validateId');
const validate = require('../../../middleware/joiValidator');
const Joi = require('joi');

const purchaseValidation = Joi.object({
  competition_id: Joi.string().required().messages({
    'string.empty': 'Competition ID is required',
    'any.required': 'Competition ID is required',
  }),
  quantity: Joi.number().integer().min(1).optional().messages({
    'number.min': 'Quantity must be at least 1',
    'number.base': 'Quantity must be a number',
  }),
});

router.post('/purchase', authMiddleware, validate(purchaseValidation), ticketController.purchaseTicket);
router.get('/my', authMiddleware, ticketController.getMyTickets);
router.get('/competition/:id', authMiddleware, validateId(), ticketController.getCompetitionTickets);
router.get('/search', authMiddleware, ticketController.searchTicket);

module.exports = router;

