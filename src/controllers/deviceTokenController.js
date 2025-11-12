const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Register or update device token for push notifications
 * POST /api/v1/user/device-token
 */
const registerDeviceToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { device_token, platform, device_id } = req.body;

    // Validation
    if (!device_token) {
      return res.error('Device token is required', 400);
    }

    if (!platform || !['ios', 'android'].includes(platform)) {
      return res.error('Platform must be either "ios" or "android"', 400);
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.error('User not found', 404);
    }

    // Initialize device_tokens array if it doesn't exist
    if (!user.device_tokens) {
      user.device_tokens = [];
    }

    // Check if token already exists for this user
    const existingTokenIndex = user.device_tokens.findIndex(
      (dt) => dt.token === device_token
    );

    if (existingTokenIndex !== -1) {
      // Update existing token
      user.device_tokens[existingTokenIndex].platform = platform;
      user.device_tokens[existingTokenIndex].device_id = device_id || user.device_tokens[existingTokenIndex].device_id;
      user.device_tokens[existingTokenIndex].last_used_at = new Date();
    } else {
      // Add new token
      user.device_tokens.push({
        token: device_token,
        platform,
        device_id: device_id || null,
        last_used_at: new Date(),
      });
    }

    await user.save();

    logger.info('Device token registered/updated', {
      userId,
      platform,
      deviceId: device_id,
    });

    res.success('Device token registered successfully', {
      device_token: device_token.substring(0, 20) + '...', // Only show partial token
      platform,
      registered: true,
    });
  } catch (error) {
    logger.error('Failed to register device token', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    res.error(error.message || 'Failed to register device token', 500);
  }
};

/**
 * Remove device token
 * DELETE /api/v1/user/device-token
 */
const removeDeviceToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { device_token } = req.body;

    if (!device_token) {
      return res.error('Device token is required', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.error('User not found', 404);
    }

    // Remove token from array
    if (user.device_tokens && user.device_tokens.length > 0) {
      user.device_tokens = user.device_tokens.filter(
        (dt) => dt.token !== device_token
      );
      await user.save();
    }

    logger.info('Device token removed', {
      userId,
      deviceToken: device_token.substring(0, 20) + '...',
    });

    res.success('Device token removed successfully');
  } catch (error) {
    logger.error('Failed to remove device token', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    res.error(error.message || 'Failed to remove device token', 500);
  }
};

/**
 * Get user's registered device tokens (for debugging/admin)
 * GET /api/v1/user/device-token
 */
const getDeviceTokens = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('device_tokens');
    if (!user) {
      return res.error('User not found', 404);
    }

    // Return partial tokens for security
    const tokens = (user.device_tokens || []).map((dt) => ({
      token: dt.token.substring(0, 20) + '...',
      platform: dt.platform,
      device_id: dt.device_id,
      last_used_at: dt.last_used_at,
    }));

    res.success('Device tokens retrieved successfully', {
      tokens,
      count: tokens.length,
    });
  } catch (error) {
    logger.error('Failed to get device tokens', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    res.error(error.message || 'Failed to get device tokens', 500);
  }
};

module.exports = {
  registerDeviceToken,
  removeDeviceToken,
  getDeviceTokens,
};

