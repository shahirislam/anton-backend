const PointsHistory = require('../models/PointsHistory');
const User = require('../models/User');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

const getPointsHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit, skip } = getPaginationParams(req);

    const history = await PointsHistory.find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PointsHistory.countDocuments({ user_id: userId });

    res.success('Points history retrieved successfully', {
      history,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve points history', 500);
  }
};

const getPointsSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('total_points total_earned total_spent');

    if (!user) {
      return res.error('User not found', 404);
    }

    const summary = {
      total_points: user.total_points,
      total_earned: user.total_earned,
      total_spent: user.total_spent,
    };

    res.success('Points summary retrieved successfully', { summary });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve points summary', 500);
  }
};

module.exports = {
  getPointsHistory,
  getPointsSummary,
};

