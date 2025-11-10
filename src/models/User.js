const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: function() {
        return this.authProvider === 'local';
      },
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'apple', 'instagram'],
      default: 'local',
    },
    socialId: {
      type: String,
      default: null,
    },
    socialAccounts: [{
      provider: {
        type: String,
        enum: ['google', 'apple', 'instagram'],
        required: true,
      },
      socialId: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    }],
    otp: {
      type: String,
      default: null,
    },
    otp_expires_at: {
      type: Date,
      default: null,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    resetTokenUsed: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    userStatus: {
      type: String,
      enum: ['Active', 'Suspend'],
      default: 'Active',
    },
    total_points: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_earned: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_spent: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_redeemed: {
      type: Number,
      default: 0,
      min: 0,
    },
    profile_image: {
      type: String,
      default: null,
    },
    phone_number: {
      type: String,
      default: null,
      trim: true,
    },
    location: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only for local auth)
userSchema.pre('save', async function (next) {
  // Skip password hashing for social auth users or if password not modified
  if (this.authProvider !== 'local' || !this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Auto-verify social auth users
userSchema.pre('save', async function (next) {
  if (this.authProvider !== 'local' && !this.verified) {
    this.verified = true;
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes
userSchema.index({ role: 1 }); // email already indexed via unique: true
userSchema.index({ socialId: 1 }); // Index for social ID lookups
userSchema.index({ 'socialAccounts.socialId': 1 }); // Index for linked account lookups
userSchema.index({ userStatus: 1 }); // Index for user status lookups

const User = mongoose.model('User', userSchema);

module.exports = User;

