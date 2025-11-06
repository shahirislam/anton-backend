const express = require('express');
const router = express.Router();
const ticketController = require('../../../../controllers/ticketController');
const validateId = require('../../../../middleware/validateId');

router.get('/competition/:competition_id', validateId('competition_id'), ticketController.getCompetitionTicketsList);
router.get('/search', ticketController.searchTicket);

module.exports = router;

