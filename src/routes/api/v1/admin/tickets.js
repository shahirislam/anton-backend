const express = require('express');
const router = express.Router();
const adminTicketController = require('../../../controllers/admin/adminTicketController');
const validateId = require('../../../middleware/validateId');

router.get('/', adminTicketController.getTickets);
router.get('/:competition_id', validateId('competition_id'), adminTicketController.getTicketsByCompetition);
router.delete('/:id', validateId(), adminTicketController.deleteTicket);

module.exports = router;

