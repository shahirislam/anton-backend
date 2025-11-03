const mongoose = require('mongoose');
const PointsHistory = require('../models/PointsHistory');
const PointsSettings = require('../models/PointsSettings');
const User = require('../models/User');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { withTransaction } = require('../utils/transactionHelper');

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

    const user = await User.findById(userId).select('total_points total_earned total_spent total_redeemed');

    if (!user) {
      return res.error('User not found', 404);
    }

    const summary = {
      total_points: user.total_points,
      total_earned: user.total_earned,
      total_spent: user.total_spent,
      total_redeemed: user.total_redeemed || 0,
    };

    res.success('Points summary retrieved successfully', { summary });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve points summary', 500);
  }
};

const getConversionRate = async (req, res) => {
  try {
    const settings = await PointsSettings.getSettings();
    
    res.success('Conversion rate retrieved successfully', {
      points_per_dollar: settings.points_per_dollar,
      is_active: settings.is_active,
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve conversion rate', 500);
  }
};

const redeemPoints = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;
    const MINIMUM_REDEMPTION = 100;

    // Validate minimum redemption amount
    if (!amount || amount < MINIMUM_REDEMPTION) {
      return res.error(`Minimum redemption amount is ${MINIMUM_REDEMPTION} points`, 400);
    }

    await withTransaction(async (session) => {
      const withSession = (query) => {
        return session ? query.session(session) : query;
      };

      // Get user with session
      const user = await withSession(User.findById(userId));

      if (!user) {
        return res.error('User not found', 404);
      }

      // Check if user has sufficient points
      if (user.total_points < amount) {
        return res.error('Insufficient points', 400);
      }

      // Deduct points from user
      user.total_points -= amount;
      user.total_redeemed += amount;
      
      const saveOptions = session ? { session } : {};
      await user.save(saveOptions);

      // Create redemption history
      const redemptionHistory = new PointsHistory({
        user_id: userId,
        type: 'redeemed',
        amount: amount,
        description: `Redeemed ${amount} points`,
      });

      await (session ? redemptionHistory.save({ session }) : redemptionHistory.save());

      res.success('Points redeemed successfully', {
        redeemed_amount: amount,
        remaining_points: user.total_points,
        total_redeemed: user.total_redeemed,
      });
    });
  } catch (error) {
    res.error(error.message || 'Failed to redeem points', 500);
  }
};

module.exports = {
  getPointsHistory,
  getPointsSummary,
  getConversionRate,
  redeemPoints,
};

