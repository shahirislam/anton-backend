const Winner = require('../models/Winner');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

const getResults = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const results = await Winner.find()
      .populate('competition_id', 'title slug image_url')
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

const getResultById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Winner.findById(id)
      .populate('competition_id', 'title slug image_url long_description')
      .populate('user_id', 'name email profile_image');

    if (!result) {
      return res.error('Result not found', 404);
    }

    res.success('Result retrieved successfully', { result });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve result', 500);
  }
};

module.exports = {
  getResults,
  getResultById,
};

