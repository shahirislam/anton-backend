const User = require('../models/User');
const { generateTokens } = require('../utils/jwt');
const { generateOTP, sendOTP, verifyOTP } = require('./otpService');
const { sendWelcomeEmail } = require('./emailService');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

const register = async (name, email, password) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Ensure password is provided for local registration
  if (!password) {
    throw new Error('Password is required for registration');
  }

  const user = new User({
    name,
    email,
    password,
    authProvider: 'local', // Explicitly set for local registration
  });

  await user.save();

  await sendWelcomeEmail(email, name);

  const tokens = generateTokens(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified,
    },
    ...tokens,
  };
};

const login = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user is a social auth user (should use social login instead)
  if (user.authProvider !== 'local') {
    throw new Error(`Please use ${user.authProvider} to sign in`);
  }

  // Check if user has a password set
  if (!user.password) {
    throw new Error('Please set a password or use social login');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const tokens = generateTokens(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified,
    },
    ...tokens,
  };
};

const requestOTP = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Unable to send OTP');
  }

  const otp = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + (parseInt(process.env.OTP_EXPIRE_MINUTES) || 10));

  user.otp = otp;
  user.otp_expires_at = expiresAt;
  await user.save();

  await sendOTP(email, otp);

  return {
    message: 'OTP sent successfully',
    expiresAt,
    otp,
  };
};

const verifyOTPCode = async (email, otp) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Invalid or expired OTP');
  }

  const isValid = verifyOTP(user.otp, otp, user.otp_expires_at);
  if (!isValid) {
    throw new Error('Invalid or expired OTP');
  }

  user.verified = true;
  user.otp = null;
  user.otp_expires_at = null;
  await user.save();

  return {
    message: 'Email verified successfully',
  };
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    return {
      message: 'If email exists, password reset link has been sent',
    };
  }

  const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  const resetTokenExpiresAt = new Date();
  resetTokenExpiresAt.setHours(resetTokenExpiresAt.getHours() + 1);

  user.resetToken = resetToken;
  user.resetTokenExpiresAt = resetTokenExpiresAt;
  user.resetTokenUsed = false;
  await user.save();

  logger.info('[MOCK] Password reset token generated', { email, tokenLength: resetToken.length });

  return {
    message: 'If email exists, password reset link has been sent',
    resetToken, 
  };
};

const resetPassword = async (token, newPassword) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new Error('Invalid or expired token');
    }

    if (user.resetToken !== token) {
      throw new Error('Invalid token. Token may have been used or invalidated.');
    }

    if (user.resetTokenUsed) {
      throw new Error('Token has already been used. Please request a new password reset.');
    }

    if (user.resetTokenExpiresAt && new Date() > user.resetTokenExpiresAt) {
      throw new Error('Token has expired. Please request a new password reset.');
    }

    user.password = newPassword;
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    user.resetTokenUsed = true;
    await user.save();

    return {
      message: 'Password reset successfully',
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

const changePassword = async (userId, currentPassword, newPassword) => {
  // Get user with password field
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new Error('User not found');
  }

  // Check if user is a local auth user
  if (user.authProvider !== 'local') {
    throw new Error(`Password change is not available for ${user.authProvider} accounts. Please use social login.`);
  }

  // Check if user has a password set
  if (!user.password) {
    throw new Error('No password set. Please use forgot password to set a password.');
  }

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new Error('Current password is incorrect');
  }

  // Check if new password is different from current password
  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    throw new Error('New password must be different from current password');
  }

  // Update password (will be hashed automatically by pre-save hook)
  user.password = newPassword;
  await user.save();

  logger.info('Password changed successfully', { userId });

  return {
    message: 'Password changed successfully',
  };
};

module.exports = {
  register,
  login,
  requestOTP,
  verifyOTPCode,
  forgotPassword,
  resetPassword,
  changePassword,
};

