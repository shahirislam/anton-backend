const User = require('../models/User');
const Ticket = require('../models/Ticket');
const PointsHistory = require('../models/PointsHistory');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -otp_expires_at');

    if (!user) {
      return res.error('User not found', 404);
    }

    res.success('Profile retrieved successfully', { user });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve profile', 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, profile_image } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.error('User not found', 404);
    }

    // Check if email is being changed and already exists
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) {
        return res.error('Email already in use', 409);
      }
      user.email = email;
      user.verified = false; // Require re-verification if email changed
    }

    if (name) user.name = name;
    if (profile_image !== undefined) user.profile_image = profile_image;

    await user.save();

    res.success('Profile updated successfully', { user });
  } catch (error) {
    res.error(error.message || 'Failed to update profile', 500);
  }
};

const getProfilePoints = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('total_points total_earned total_spent');

    if (!user) {
      return res.error('User not found', 404);
    }

    res.success('Profile points retrieved successfully', {
      total_points: user.total_points,
      total_earned: user.total_earned,
      total_spent: user.total_spent,
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve profile points', 500);
  }
};

const getProfileTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit, skip } = getPaginationParams(req);

    const transactions = await PointsHistory.find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PointsHistory.countDocuments({ user_id: userId });

    res.success('Transactions retrieved successfully', {
      transactions,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve transactions', 500);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getProfilePoints,
  getProfileTransactions,
};

