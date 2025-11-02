const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Competition = require('../models/Competition');
const User = require('../models/User');
const PointsHistory = require('../models/PointsHistory');
const { generateTicketNumber } = require('../utils/ticketNumber');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

const purchaseTicket = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { competition_id, quantity = 1 } = req.body;
    const userId = req.user._id;

    session.startTransaction();

    const competition = await Competition.findById(competition_id).session(session);
    if (!competition) {
      await session.abortTransaction();
      await session.endSession();
      return res.error('Competition not found', 404);
    }

    if (competition.status !== 'active') {
      await session.abortTransaction();
      await session.endSession();
      return res.error('Competition is not active', 400);
    }

    if (competition.tickets_sold + quantity > competition.max_tickets) {
      await session.abortTransaction();
      await session.endSession();
      return res.error('Not enough tickets available', 400);
    }

    const userTickets = await Ticket.countDocuments({
      user_id: userId,
      competition_id,
    }).session(session);

    if (userTickets + quantity > competition.max_per_person) {
      await session.abortTransaction();
      await session.endSession();
      return res.error(`Maximum ${competition.max_per_person} tickets per person`, 400);
    }

    const user = await User.findById(userId).session(session);
    
    const dollarsSpent = competition.ticket_price * quantity;
    const pointsToSpend = Math.floor(dollarsSpent * 100);

    if (user.total_points < pointsToSpend) {
      await session.abortTransaction();
      await session.endSession();
      return res.error('Insufficient points', 400);
    }

    const tickets = [];
    const MAX_RETRY_ATTEMPTS = 50; 
    
    for (let i = 0; i < quantity; i++) {
      let ticketNumber = generateTicketNumber();
      let attempts = 0;
      
      while (await Ticket.findOne({ ticket_number: ticketNumber }).session(session)) {
        attempts++;
        if (attempts >= MAX_RETRY_ATTEMPTS) {
          await session.abortTransaction();
          await session.endSession();
          return res.error('Failed to generate unique ticket number. Please try again.', 500);
        }
        ticketNumber = generateTicketNumber();
      }

      tickets.push(
        new Ticket({
          ticket_number: ticketNumber,
          user_id: userId,
          competition_id,
          price: competition.ticket_price,
        })
      );
    }

    await Ticket.insertMany(tickets, { session });

    competition.tickets_sold += quantity;
    await competition.save({ session });

    user.total_points -= pointsToSpend;
    user.total_spent += pointsToSpend;

    const cashbackRate = 0.10; 
    const pointsEarned = Math.floor(dollarsSpent * 100 * cashbackRate);

    user.total_points += pointsEarned;
    user.total_earned += pointsEarned;
    await user.save({ session });

    await PointsHistory.create({
      user_id: userId,
      type: 'spent',
      amount: pointsToSpend,
      description: `Purchased ${quantity} ticket(s) for ${competition.title}`,
    }, { session });

    await PointsHistory.create({
      user_id: userId,
      type: 'earned',
      amount: pointsEarned,
      description: `Earned ${pointsEarned} points for purchasing ${quantity} ticket(s) (${dollarsSpent.toFixed(2)} spent)`,
    }, { session });

    await session.commitTransaction();
    await session.endSession();

    res.success('Tickets purchased successfully', {
      tickets,
      points_earned: pointsEarned,
      total_points_balance: user.total_points,
    }, 201);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    await session.endSession();
    res.error(error.message || 'Failed to purchase tickets', 500);
  }
};

const getMyTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit, skip } = getPaginationParams(req);

    const tickets = await Ticket.find({ user_id: userId })
      .populate('competition_id', 'title slug image_url draw_time')
      .sort({ purchase_date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments({ user_id: userId });

    res.success('Tickets retrieved successfully', {
      tickets,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve tickets', 500);
  }
};

const getCompetitionTickets = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const tickets = await Ticket.find({
      user_id: userId,
      competition_id: id,
    })
      .populate('competition_id', 'title')
      .sort({ purchase_date: -1 });

    res.success('Tickets retrieved successfully', { tickets });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve tickets', 500);
  }
};

const searchTicket = async (req, res) => {
  try {
    const { ticket_number } = req.query;
    if (!ticket_number) {
      return res.error('Ticket number is required', 400);
    }

    const tickets = await Ticket.find({
      ticket_number: { $regex: ticket_number, $options: 'i' }
    })
      .populate('user_id', 'name')
      .populate('competition_id', 'title slug');

    if (!tickets || tickets.length === 0) {
      return res.error('No tickets found', 404);
    }

    res.success('Tickets retrieved successfully', { 
      tickets,
      count: tickets.length
    });
  } catch (error) {
    res.error(error.message || 'Failed to search ticket', 500);
  }
};

module.exports = {
  purchaseTicket,
  getMyTickets,
  getCompetitionTickets,
  searchTicket,
};

