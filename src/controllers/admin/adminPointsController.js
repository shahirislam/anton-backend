const User = require('../../models/User');
const PointsHistory = require('../../models/PointsHistory');
const PointsSettings = require('../../models/PointsSettings');
const Joi = require('joi');
const { withTransaction } = require('../../utils/transactionHelper');

const addPoints = async (req, res) => {
  try {
    const { user_id, amount, description } = req.body;

    await withTransaction(async (session) => {
      // Helper to add session if transactions are supported
      const withSession = (query) => session ? query.session(session) : query;
      const createOptions = session ? { session } : {};

      const user = await withSession(User.findById(user_id));
      if (!user) {
        return res.error('User not found', 404);
      }

      user.total_points += amount;
      user.total_earned += amount;
      await (session ? user.save({ session }) : user.save());

      await PointsHistory.create({
        user_id,
        type: 'earned',
        amount,
        description: description || 'Admin added points',
      }, createOptions);

      res.success('Points added successfully', {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          total_points: user.total_points,
        },
      });
    });
  } catch (error) {
    res.error(error.message || 'Failed to add points', 500);
  }
};

const deductPoints = async (req, res) => {
  try {
    const { user_id, amount, description } = req.body;

    await withTransaction(async (session) => {
      // Helper to add session if transactions are supported
      const withSession = (query) => session ? query.session(session) : query;
      const createOptions = session ? { session } : {};

      const user = await withSession(User.findById(user_id));
      if (!user) {
        return res.error('User not found', 404);
      }

      if (user.total_points < amount) {
        return res.error('Insufficient points', 400);
      }

      user.total_points -= amount;
      user.total_spent += amount;
      await (session ? user.save({ session }) : user.save());

      await PointsHistory.create({
        user_id,
        type: 'spent',
        amount,
        description: description || 'Admin deducted points',
      }, createOptions);

      res.success('Points deducted successfully', {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          total_points: user.total_points,
        },
      });
    });
  } catch (error) {
    res.error(error.message || 'Failed to deduct points', 500);
  }
};

const getPointsSettings = async (req, res) => {
  try {
    const settings = await PointsSettings.getSettings();
    
    res.success('Points settings retrieved successfully', { settings });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve points settings', 500);
  }
};

const updatePointsSettings = async (req, res) => {
  try {
    const { points_per_dollar, is_active } = req.body;
    const userId = req.user._id;

    // Get existing settings or create new one
    let settings = await PointsSettings.findOne();
    
    if (!settings) {
      settings = new PointsSettings({
        points_per_dollar: points_per_dollar || 10,
        is_active: is_active !== undefined ? is_active : true,
        updated_by: userId,
      });
    } else {
      if (points_per_dollar !== undefined) {
        settings.points_per_dollar = points_per_dollar;
      }
      if (is_active !== undefined) {
        settings.is_active = is_active;
      }
      settings.updated_by = userId;
    }

    await settings.save();

    res.success('Points settings updated successfully', { settings });
  } catch (error) {
    res.error(error.message || 'Failed to update points settings', 500);
  }
};

const pointsValidation = Joi.object({
  user_id: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required',
  }),
  amount: Joi.number().min(0.01).required().messages({
    'number.min': 'Valid amount is required',
    'any.required': 'Amount is required',
  }),
  description: Joi.string().trim().optional(),
});

const pointsSettingsValidation = Joi.object({
  points_per_dollar: Joi.number().min(0.01).optional().messages({
    'number.min': 'Points per dollar must be greater than 0',
  }),
  is_active: Joi.boolean().optional().messages({
    'boolean.base': 'Is active must be a boolean',
  }),
});

module.exports = {
  addPoints,
  deductPoints,
  getPointsSettings,
  updatePointsSettings,
  pointsValidation,
  pointsSettingsValidation,
};

