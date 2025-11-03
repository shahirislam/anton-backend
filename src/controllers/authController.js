const Joi = require('joi');
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

// Validation schemas using Joi
const registerValidation = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Valid email is required',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

const loginValidation = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Valid email is required',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
});

const otpValidation = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Valid email is required',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
});

const verifyOtpValidation = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Valid email is required',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
  otp: Joi.string().length(6).required().messages({
    'string.length': 'OTP must be 6 digits',
    'any.required': 'OTP is required',
  }),
});

const forgotPasswordValidation = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Valid email is required',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
});

const resetPasswordValidation = Joi.object({
  token: Joi.string().required().messages({
    'string.empty': 'Token is required',
    'any.required': 'Token is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

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

