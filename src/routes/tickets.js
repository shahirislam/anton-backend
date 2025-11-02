const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/authMiddleware');
const validateId = require('../middleware/validateId');
const validateRequest = require('../middleware/validateRequest');
const { body } = require('express-validator');

const purchaseValidation = [
  body('competition_id').notEmpty().withMessage('Competition ID is required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

router.post('/purchase', authMiddleware, purchaseValidation, validateRequest, ticketController.purchaseTicket);

router.get('/my', authMiddleware, ticketController.getMyTickets);
router.get('/competition/:id', authMiddleware, validateId(), ticketController.getCompetitionTickets);
router.get('/search', authMiddleware, ticketController.searchTicket);

module.exports = router;

