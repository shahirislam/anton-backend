const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Competition = require('../models/Competition');
const User = require('../models/User');
const Winner = require('../models/Winner');
const PointsHistory = require('../models/PointsHistory');
const PointsSettings = require('../models/PointsSettings');
const { generateTicketNumber } = require('../utils/ticketNumber');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { withTransaction } = require('../utils/transactionHelper');

const purchaseTicket = async (req, res) => {
  try {
    const { competition_id, quantity = 1 } = req.body;
    const userId = req.user._id;

    await withTransaction(async (session) => {
      // Helper to add session if transactions are supported
      const withSession = (query) => session ? query.session(session) : query;
      const createOptions = session ? { session } : {};

      const competition = await withSession(Competition.findById(competition_id));
      if (!competition) {
        return res.error('Competition not found', 404);
      }

      if (competition.status !== 'active') {
        return res.error('Competition is not active', 400);
      }

      if (competition.tickets_sold + quantity > competition.max_tickets) {
        return res.error('Not enough tickets available', 400);
      }

      const userTickets = await withSession(Ticket.countDocuments({
        user_id: userId,
        competition_id,
      }));

      if (userTickets + quantity > competition.max_per_person) {
        const remaining = Math.max(0, competition.max_per_person - userTickets);
        return res.error(
          `Maximum ${competition.max_per_person} tickets per person. You already have ${userTickets} ticket(s), and can purchase up to ${remaining} more.`,
          400
        );
      }

      const user = await withSession(User.findById(userId));
      
      const dollarsSpent = competition.ticket_price * quantity;
      const pointsToSpend = Math.floor(dollarsSpent * 100);

      if (user.total_points < pointsToSpend) {
        return res.error('Insufficient points', 400);
      }

      const pointsSettings = await PointsSettings.getSettings();
      
      if (!pointsSettings.is_active) {
        return res.error('Points earning is currently disabled', 400);
      }

      const pointsEarned = Math.floor(dollarsSpent * pointsSettings.points_per_dollar);

      const tickets = [];
      const MAX_RETRY_ATTEMPTS = 50; 
      
      for (let i = 0; i < quantity; i++) {
        let ticketNumber = generateTicketNumber();
        let attempts = 0;
        
        while (await withSession(Ticket.findOne({ ticket_number: ticketNumber }))) {
          attempts++;
          if (attempts >= MAX_RETRY_ATTEMPTS) {
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

      await Ticket.insertMany(tickets, createOptions);

      competition.tickets_sold += quantity;
      await (session ? competition.save({ session }) : competition.save());

      user.total_points -= pointsToSpend;
      user.total_spent += pointsToSpend;
      user.total_points += pointsEarned;
      user.total_earned += pointsEarned;
      await (session ? user.save({ session }) : user.save());

      // Create PointsHistory records
      const spentHistory = new PointsHistory({
        user_id: userId,
        type: 'spent',
        amount: pointsToSpend,
        description: `Purchased ${quantity} ticket(s) for ${competition.title}`,
      });
      await (session ? spentHistory.save({ session }) : spentHistory.save());

      const earnedHistory = new PointsHistory({
        user_id: userId,
        type: 'earned',
        amount: pointsEarned,
        description: `Earned ${pointsEarned} points for purchasing ${quantity} ticket(s) (${dollarsSpent.toFixed(2)} spent)`,
      });
      await (session ? earnedHistory.save({ session }) : earnedHistory.save());

      res.success('Tickets purchased successfully', {
        tickets,
        points_earned: pointsEarned,
        total_points_balance: user.total_points,
      }, 201);
    });
  } catch (error) {
    res.error(error.message || 'Failed to purchase tickets', 500);
  }
};

const getMyTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit, skip } = getPaginationParams(req);

    const tickets = await Ticket.find({ user_id: userId })
      .populate('competition_id', 'title slug image_url draw_time status')
      .sort({ purchase_date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments({ user_id: userId });

    // Get distinct competition IDs from user's tickets where competitions are active
    const activeCompetitionIds = await Ticket.distinct('competition_id', {
      user_id: userId,
    });

    // Count active competitions (where status is 'active')
    const activeCompetitions = await Competition.countDocuments({
      _id: { $in: activeCompetitionIds },
      status: 'active',
    });

    // Count total prizes won by user
    const wonPrizes = await Winner.countDocuments({ user_id: userId });

    res.success('Tickets retrieved successfully', {
      active_entries: activeCompetitions,
      won_prizes: wonPrizes,
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

