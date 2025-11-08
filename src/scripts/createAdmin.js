require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const createAdmin = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to database\n');

    // Get admin details
    const name = await question('Enter admin name: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password (min 6 characters): ');

    if (!name || !email || !password) {
      console.error('All fields are required!');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('Password must be at least 6 characters!');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log(`\nUser with email ${email} already exists.`);
      const update = await question('Do you want to make this user an admin? (y/n): ');
      
      if (update.toLowerCase() === 'y') {
        existingUser.role = 'admin';
        await existingUser.save();
        console.log(`\nUser ${email} is now an admin!`);
        process.exit(0);
      } else {
        console.log('Operation cancelled.');
        process.exit(0);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin',
      verified: true, // Auto-verify admin users
      authProvider: 'local',
    });

    await admin.save();

    console.log('\nAdmin user created successfully!');
    console.log('════════════════════════════════════════');
    console.log('👨‍💼 Admin Account Details:');
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Verified: ${admin.verified}`);
    console.log('════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin user:', error.message);
    if (error.code === 11000) {
      console.error('   Error: Email already exists in database');
    }
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Run script
createAdmin();

