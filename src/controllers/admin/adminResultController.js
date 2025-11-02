const Winner = require('../../models/Winner');
const { body, validationResult } = require('express-validator');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');

const createResult = async (req, res) => {
  try {
    const result = new Winner(req.body);
    await result.save();

    res.success('Result created successfully', { result }, 201);
  } catch (error) {
    res.error(error.message || 'Failed to create result', 500);
  }
};

const updateResult = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Winner.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!result) {
      return res.error('Result not found', 404);
    }

    res.success('Result updated successfully', { result });
  } catch (error) {
    res.error(error.message || 'Failed to update result', 500);
  }
};

const getResults = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const results = await Winner.find()
      .populate('competition_id', 'title slug')
      .populate('user_id', 'name email')
      .sort({ draw_date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Winner.countDocuments();

    res.success('Results retrieved successfully', {
      results,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve results', 500);
  }
};

const resultValidation = [
  body('competition_id').notEmpty().withMessage('Competition ID is required'),
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('ticket_number').trim().notEmpty().withMessage('Ticket number is required'),
  body('prize_value').isFloat({ min: 0 }).withMessage('Valid prize value is required'),
  body('draw_date').optional().isISO8601().withMessage('Valid draw date is required'),
];

module.exports = {
  createResult,
  updateResult,
  getResults,
  resultValidation,
};

