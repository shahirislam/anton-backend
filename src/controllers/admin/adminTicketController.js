const Ticket = require('../../models/Ticket');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');

const getTickets = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const tickets = await Ticket.find()
      .populate('user_id', 'name email')
      .populate('competition_id', 'title slug')
      .sort({ purchase_date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments();

    res.success('Tickets retrieved successfully', {
      tickets,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve tickets', 500);
  }
};

const getTicketsByCompetition = async (req, res) => {
  try {
    const { competition_id } = req.params;
    const { page, limit, skip } = getPaginationParams(req);

    const tickets = await Ticket.find({ competition_id })
      .populate('user_id', 'name')
      .select('ticket_number user_id purchase_date')
      .sort({ purchase_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Ticket.countDocuments({ competition_id });

    // Format response with only required fields
    const formattedTickets = tickets.map(ticket => ({
      ticket_number: ticket.ticket_number,
      username: ticket.user_id?.name || 'N/A',
      date_time: ticket.purchase_date,
    }));

    res.success('Tickets retrieved successfully', {
      tickets: formattedTickets,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve tickets', 500);
  }
};

const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findByIdAndDelete(id);

    if (!ticket) {
      return res.error('Ticket not found', 404);
    }

    res.success('Ticket deleted successfully');
  } catch (error) {
    res.error(error.message || 'Failed to delete ticket', 500);
  }
};

module.exports = {
  getTickets,
  getTicketsByCompetition,
  deleteTicket,
};

