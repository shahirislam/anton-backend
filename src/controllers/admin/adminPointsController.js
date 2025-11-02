const mongoose = require('mongoose');
const User = require('../../models/User');
const PointsHistory = require('../../models/PointsHistory');
const { body, validationResult } = require('express-validator');

const addPoints = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { user_id, amount, description } = req.body;

    session.startTransaction();

    const user = await User.findById(user_id).session(session);
    if (!user) {
      await session.abortTransaction();
      await session.endSession();
      return res.error('User not found', 404);
    }

    user.total_points += amount;
    user.total_earned += amount;
    await user.save({ session });

    await PointsHistory.create({
      user_id,
      type: 'earned',
      amount,
      description: description || 'Admin added points',
    }, { session });

    await session.commitTransaction();
    await session.endSession();

    res.success('Points added successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        total_points: user.total_points,
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    await session.endSession();
    res.error(error.message || 'Failed to add points', 500);
  }
};

const deductPoints = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { user_id, amount, description } = req.body;

    session.startTransaction();

    const user = await User.findById(user_id).session(session);
    if (!user) {
      await session.abortTransaction();
      await session.endSession();
      return res.error('User not found', 404);
    }

    if (user.total_points < amount) {
      await session.abortTransaction();
      await session.endSession();
      return res.error('Insufficient points', 400);
    }

    user.total_points -= amount;
    user.total_spent += amount;
    await user.save({ session });

    await PointsHistory.create({
      user_id,
      type: 'spent',
      amount,
      description: description || 'Admin deducted points',
    }, { session });

    await session.commitTransaction();
    await session.endSession();

    res.success('Points deducted successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        total_points: user.total_points,
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    await session.endSession();
    res.error(error.message || 'Failed to deduct points', 500);
  }
};

const pointsValidation = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('description').optional().trim(),
];

module.exports = {
  addPoints,
  deductPoints,
  pointsValidation,
};

