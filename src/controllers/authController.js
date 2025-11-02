const { body } = require('express-validator');
const authService = require('../services/authService');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const result = await authService.register(name, email, password);

    res.success('Registration successful', result, 201);
  } catch (error) {
    if (error.message === 'Email already registered') {
      return res.error(error.message, 409);
    }
    res.error(error.message || 'Registration failed', 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.success('Login successful', result);
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      return res.error(error.message, 401);
    }
    res.error(error.message || 'Login failed', 500);
  }
};

const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await authService.requestOTP(email);

    res.success(result.message, result);
  } catch (error) {
    res.error(error.message || 'Failed to send OTP', 500);
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await authService.verifyOTPCode(email, otp);

    res.success(result.message);
  } catch (error) {
    if (error.message === 'Invalid or expired OTP') {
      return res.error(error.message, 400);
    }
    res.error(error.message || 'OTP verification failed', 500);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    res.success(result.message, result);
  } catch (error) {
    res.error(error.message || 'Failed to process request', 500);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    res.success(result.message);
  } catch (error) {
    if (error.message === 'Invalid or expired token' || error.message === 'Token has expired') {
      return res.error(error.message, 400);
    }
    res.error(error.message || 'Password reset failed', 500);
  }
};

const logout = async (req, res) => {
  // In production, implement token blacklisting
  // For now, client-side should remove token
  res.success('Logged out successfully');
};

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const otpValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const verifyOtpValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

module.exports = {
  register,
  login,
  requestOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  logout,
  registerValidation,
  loginValidation,
  otpValidation,
  verifyOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};

