const Category = require('../models/Category');

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    res.success('Categories retrieved successfully', { categories });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve categories', 500);
  }
};

module.exports = {
  getCategories,
};

