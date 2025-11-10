const User = require('../../models/User');
const Ticket = require('../../models/Ticket');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');
const Joi = require('joi');

const getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { role, verified, userStatus } = req.query;

    const query = {};
    // By default, only show regular users (exclude admins)
    // Only include admins if explicitly requested via role=admin query param
    if (role) {
      query.role = role;
    } else {
      query.role = 'user'; // Default to only regular users
    }
    if (verified !== undefined) query.verified = verified === 'true';
    if (userStatus) query.userStatus = userStatus;

    const users = await User.find(query)
      .select('name email userStatus total_spent _id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get ticket counts for all users in one query
    const userIds = users.map(user => user._id);
    const ticketCounts = await Ticket.aggregate([
      { $match: { user_id: { $in: userIds } } },
      { $group: { _id: '$user_id', count: { $sum: 1 } } },
    ]);

    // Create a map for quick lookup
    const ticketCountMap = {};
    ticketCounts.forEach(item => {
      ticketCountMap[item._id] = item.count;
    });

    // Format users with ticket counts
    const formattedUsers = users.map(user => {
      const userObj = user.toObject();
      return {
        _id: userObj._id,
        Name: userObj.name,
        email: userObj.email,
        userStatus: userObj.userStatus || 'Active',
        TotalSpent: userObj.total_spent || 0,
        Tickets: ticketCountMap[userObj._id] || 0,
      };
    });

    const total = await User.countDocuments(query);

    res.success('Users retrieved successfully', {
      users: formattedUsers,
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

const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent suspending yourself
    if (id === req.user._id) {
      return res.error('Cannot suspend your own account', 400);
    }

    const user = await User.findByIdAndUpdate(
      id,
      { userStatus: 'Suspend' },
      { new: true, runValidators: true }
    ).select('-password -otp -otp_expires_at');

    if (!user) {
      return res.error('User not found', 404);
    }

    res.success('User suspended successfully', { user });
  } catch (error) {
    res.error(error.message || 'Failed to suspend user', 500);
  }
};

const reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { userStatus: 'Active' },
      { new: true, runValidators: true }
    ).select('-password -otp -otp_expires_at');

    if (!user) {
      return res.error('User not found', 404);
    }

    res.success('User reactivated successfully', { user });
  } catch (error) {
    res.error(error.message || 'Failed to reactivate user', 500);
  }
};

const updateUserValidation = Joi.object({
  name: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name cannot be empty',
  }),
  email: Joi.string().email().lowercase().trim().optional().messages({
    'string.email': 'Valid email is required',
  }),
  role: Joi.string().valid('user', 'admin').optional().messages({
    'any.only': 'Invalid role',
  }),
  verified: Joi.boolean().optional().messages({
    'boolean.base': 'Verified must be boolean',
  }),
  userStatus: Joi.string().valid('Active', 'Suspend').optional().messages({
    'any.only': 'Invalid user status',
  }),
});

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  suspendUser,
  reactivateUser,
  updateUserValidation,
};

