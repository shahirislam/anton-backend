const Winner = require('../../models/Winner');
const Joi = require('joi');
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

const resultValidation = Joi.object({
  competition_id: Joi.string().required().messages({
    'string.empty': 'Competition ID is required',
    'any.required': 'Competition ID is required',
  }),
  user_id: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required',
  }),
  ticket_number: Joi.string().trim().required().messages({
    'string.empty': 'Ticket number is required',
    'any.required': 'Ticket number is required',
  }),
  prize_value: Joi.number().min(0).required().messages({
    'number.min': 'Valid prize value is required',
    'any.required': 'Prize value is required',
  }),
  draw_date: Joi.date().iso().optional().messages({
    'date.base': 'Valid draw date is required',
  }),
});

module.exports = {
  createResult,
  updateResult,
  getResults,
  resultValidation,
};

