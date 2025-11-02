const User = require('../../models/User');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');
const { body, validationResult } = require('express-validator');

const getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { role, verified } = req.query;

    const query = {};
    if (role) query.role = role;
    if (verified !== undefined) query.verified = verified === 'true';

    const users = await User.find(query)
      .select('-password -otp -otp_expires_at')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.success('Users retrieved successfully', {
      users,
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve users', 500);
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password -otp -otp_expires_at');

    if (!user) {
      return res.error('User not found', 404);
    }

    res.success('User retrieved successfully', { user });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve user', 500);
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow password updates via this route
    const { password, ...updateData } = req.body;

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password -otp -otp_expires_at');

    if (!user) {
      return res.error('User not found', 404);
    }

    res.success('User updated successfully', { user });
  } catch (error) {
    res.error(error.message || 'Failed to update user', 500);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user._id) {
      return res.error('Cannot delete your own account', 400);
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.error('User not found', 404);
    }

    res.success('User deleted successfully');
  } catch (error) {
    res.error(error.message || 'Failed to delete user', 500);
  }
};

const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
  body('verified').optional().isBoolean().withMessage('Verified must be boolean'),
];

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserValidation,
};

