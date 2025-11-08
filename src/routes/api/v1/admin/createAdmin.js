const express = require('express');
const router = express.Router();
const User = require('../../../../models/User');
const bcrypt = require('bcrypt');

/**
 * One-time admin creation endpoint
 * SECURITY: This should be disabled after creating your first admin
 * Add ADMIN_CREATION_SECRET to your .env file
 */
router.post('/create-admin', async (req, res) => {
  try {
    // Security check - require secret key
    const secret = process.env.ADMIN_CREATION_SECRET;
    if (!secret) {
      return res.error('Admin creation is not configured. Please set ADMIN_CREATION_SECRET in environment variables.', 503);
    }

    const { secretKey, name, email, password } = req.body;

    // Verify secret key
    if (secretKey !== secret) {
      return res.error('Invalid secret key', 401);
    }

    // Validate input
    if (!name || !email || !password) {
      return res.error('Name, email, and password are required', 400);
    }

    if (password.length < 6) {
      return res.error('Password must be at least 6 characters', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // Check if already admin
      if (existingUser.role === 'admin') {
        return res.error('User is already an admin', 409);
      }
      
      // Make existing user an admin
      existingUser.role = 'admin';
      await existingUser.save();
      
      return res.success('User is now an admin', {
        email: existingUser.email,
        role: existingUser.role,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin',
      verified: true,
      authProvider: 'local',
    });

    await admin.save();

    res.success('Admin user created successfully', {
      name: admin.name,
      email: admin.email,
      role: admin.role,
      verified: admin.verified,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.error('Email already exists', 409);
    }
    res.error('Failed to create admin user: ' + error.message, 500);
  }
});

module.exports = router;

