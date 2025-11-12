const Category = require('../../models/Category');
const Joi = require('joi');

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

    const category = await Category.findOneAndUpdate({ _id: id }, req.body, {
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

    const category = await Category.findOneAndDelete({ _id: id });

    if (!category) {
      return res.error('Category not found', 404);
    }

    res.success('Category deleted successfully');
  } catch (error) {
    res.error(error.message || 'Failed to delete category', 500);
  }
};

const categoryValidation = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Category name is required',
    'any.required': 'Category name is required',
  }),
  image_url: Joi.string().uri().optional().messages({
    'string.uri': 'Image URL must be valid',
  }),
});

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
  categoryValidation,
};

