const Category = require('../../models/Category');
const { body, validationResult } = require('express-validator');

const createCategory = async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();

    res.success('Category created successfully', { category }, 201);
  } catch (error) {
    res.error(error.message || 'Failed to create category', 500);
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.error('Category not found', 404);
    }

    res.success('Category updated successfully', { category });
  } catch (error) {
    res.error(error.message || 'Failed to update category', 500);
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.error('Category not found', 404);
    }

    res.success('Category deleted successfully');
  } catch (error) {
    res.error(error.message || 'Failed to delete category', 500);
  }
};

const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('image_url').optional().isURL().withMessage('Image URL must be valid'),
];

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
  categoryValidation,
};

