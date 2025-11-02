const Competition = require('../../models/Competition');
const Ticket = require('../../models/Ticket');
const Winner = require('../../models/Winner');
const { body, validationResult } = require('express-validator');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');

const createCompetition = async (req, res) => {
  try {
    const competition = new Competition(req.body);
    await competition.save();

    res.success('Competition created successfully', { competition }, 201);
  } catch (error) {
    res.error(error.message || 'Failed to create competition', 500);
  }
};

const updateCompetition = async (req, res) => {
  try {
    const { id } = req.params;

    const competition = await Competition.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!competition) {
      return res.error('Competition not found', 404);
    }

    res.success('Competition updated successfully', { competition });
  } catch (error) {
    res.error(error.message || 'Failed to update competition', 500);
  }
};

const deleteCompetition = async (req, res) => {
  try {
    const { id } = req.params;

    const competition = await Competition.findById(id);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    const ticketCount = await Ticket.countDocuments({ competition_id: id });
    const winnerCount = await Winner.countDocuments({ competition_id: id });

    if (ticketCount > 0 || winnerCount > 0) {
      return res.error(
        `Cannot delete competition. Associated records found: ${ticketCount} ticket(s) and ${winnerCount} winner(s). Please remove associated records first or use soft delete.`,
        409
      );
    }

    await Competition.findByIdAndDelete(id);

    res.success('Competition deleted successfully');
  } catch (error) {
    res.error(error.message || 'Failed to delete competition', 500);
  }
};

const getCompetitions = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { status, category_id } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category_id) query.category_id = category_id;

    const competitions = await Competition.find(query)
      .populate('category_id', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Competition.countDocuments(query);

    res.success('Competitions retrieved successfully', {
      competitions,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve competitions', 500);
  }
};

const competitionValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('short_description').trim().notEmpty().withMessage('Short description is required'),
  body('long_description').trim().notEmpty().withMessage('Long description is required'),
  body('category_id').notEmpty().withMessage('Category ID is required'),
  body('draw_time').isISO8601().withMessage('Valid draw time is required'),
  body('ticket_price').isFloat({ min: 0.01 }).withMessage('Valid ticket price is required'),
  body('max_tickets').isInt({ min: 1 }).withMessage('Max tickets must be at least 1'),
  body('max_per_person').isInt({ min: 1 }).withMessage('Max per person must be at least 1'),
  body('status').optional().isIn(['upcoming', 'active', 'closed', 'completed']),
  body('cash_alternative').optional().isFloat({ min: 0 }),
];

module.exports = {
  createCompetition,
  updateCompetition,
  deleteCompetition,
  getCompetitions,
  competitionValidation,
};

