const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const categorySchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: false, // Auto-generated in pre-save hook
      unique: true,
      lowercase: true,
    },
    image_url: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from name before saving (run before validation)
categorySchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Indexes
// slug already indexed via unique: true

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;

