const Competition = require('../../models/Competition');
const Ticket = require('../../models/Ticket');
const Winner = require('../../models/Winner');
const Joi = require('joi');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');
const { getFileUrl } = require('../../utils/fileHelper');

const createCompetition = async (req, res) => {
  try {
    const competitionData = { ...req.body };

    if (req.file) {
      competitionData.image_url = `/uploads/competitions/${req.file.filename}`;
    }

    const competition = new Competition(competitionData);
    await competition.save();

    if (competition.image_url) {
      competition.image_url = getFileUrl(competition.image_url);
    }

    res.success('Competition created successfully', { competition }, 201);
  } catch (error) {
    res.error(error.message || 'Failed to create competition', 500);
  }
};

const updateCompetition = async (req, res) => {
  try {
    const { id } = req.params;

    const competition = await Competition.findById(id);
    if (!competition) {
      return res.error('Competition not found', 404);
    }

    const updateData = { ...req.body };

    if (req.file) {
      const { deleteFile } = require('../../utils/fileHelper');
      
      if (competition.image_url && !competition.image_url.startsWith('http')) {
        await deleteFile(competition.image_url);
      }

      updateData.image_url = `/uploads/competitions/${req.file.filename}`;
    }

    Object.assign(competition, updateData);
    await competition.save();

    if (competition.image_url) {
      competition.image_url = getFileUrl(competition.image_url);
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

    if (competition.image_url && !competition.image_url.startsWith('http')) {
      const { deleteFile } = require('../../utils/fileHelper');
      await deleteFile(competition.image_url);
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

    const competitionsWithUrls = competitions.map((competition) => {
      const comp = competition.toObject();
      if (comp.image_url && !comp.image_url.startsWith('http')) {
        comp.image_url = getFileUrl(comp.image_url);
      }
      return comp;
    });

    const total = await Competition.countDocuments(query);

    res.success('Competitions retrieved successfully', {
      competitions: competitionsWithUrls,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve competitions', 500);
  }
};

const competitionValidation = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'Title is required',
    'any.required': 'Title is required',
  }),
  short_description: Joi.string().trim().required().messages({
    'string.empty': 'Short description is required',
    'any.required': 'Short description is required',
  }),
  long_description: Joi.string().trim().required().messages({
    'string.empty': 'Long description is required',
    'any.required': 'Long description is required',
  }),
  category_id: Joi.string().required().messages({
    'string.empty': 'Category ID is required',
    'any.required': 'Category ID is required',
  }),
  draw_time: Joi.date().iso().required().messages({
    'date.base': 'Valid draw time is required',
    'any.required': 'Draw time is required',
  }),
  ticket_price: Joi.number().min(0.01).required().messages({
    'number.min': 'Valid ticket price is required',
    'any.required': 'Ticket price is required',
  }),
  max_tickets: Joi.number().integer().min(1).required().messages({
    'number.min': 'Max tickets must be at least 1',
    'any.required': 'Max tickets is required',
  }),
  max_per_person: Joi.number().integer().min(1).required().messages({
    'number.min': 'Max per person must be at least 1',
    'any.required': 'Max per person is required',
  }),
  status: Joi.string().valid('upcoming', 'active', 'closed', 'completed').optional(),
  cash_alternative: Joi.number().min(0).optional(),
  image_url: Joi.string().uri().optional().messages({
    'string.uri': 'Image URL must be a valid URL',
  }),
  live_draw_watching_url: Joi.string().uri().optional().messages({
    'string.uri': 'Live draw watching URL must be a valid URL',
  }),
});

const updateCompetitionPartialValidation = Joi.object({
  live_draw_watching_url: Joi.string().uri().optional().messages({
    'string.uri': 'Live draw watching URL must be a valid URL',
  }),
  draw_time: Joi.date().iso().optional().messages({
    'date.base': 'Valid draw time is required',
  }),
  status: Joi.string().valid('upcoming', 'active', 'closed', 'completed').optional(),
  image_url: Joi.string().uri().optional().messages({
    'string.uri': 'Image URL must be a valid URL',
  }),
});

module.exports = {
  createCompetition,
  updateCompetition,
  deleteCompetition,
  getCompetitions,
  competitionValidation,
  updateCompetitionPartialValidation,
};

