const Competition = require('../models/Competition');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

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

const getRecentCompetitions = async (req, res) => {
  try {
    const competitions = await Competition.find({ status: 'active' })
      .populate('category_id', 'name slug')
      .sort({ createdAt: -1 })
      .limit(5);

    res.success('Recent competitions retrieved successfully', { competitions });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve recent competitions', 500);
  }
};

const searchCompetitions = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.error('Search query is required', 400);
    }

    const competitions = await Competition.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { short_description: { $regex: query, $options: 'i' } },
        { long_description: { $regex: query, $options: 'i' } },
      ],
    })
      .populate('category_id', 'name slug')
      .limit(20);

    res.success('Search results retrieved successfully', { competitions });
  } catch (error) {
    res.error(error.message || 'Search failed', 500);
  }
};

const getCompetitionById = async (req, res) => {
  try {
    const { id } = req.params;

    const competition = await Competition.findById(id).populate('category_id', 'name slug image_url');

    if (!competition) {
      return res.error('Competition not found', 404);
    }

    res.success('Competition retrieved successfully', { competition });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve competition', 500);
  }
};

module.exports = {
  getCompetitions,
  getRecentCompetitions,
  searchCompetitions,
  getCompetitionById,
};

