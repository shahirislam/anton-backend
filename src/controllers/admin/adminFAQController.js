const FAQ = require('../../models/FAQ');
const Joi = require('joi');

const createFAQ = async (req, res) => {
  try {
    const faq = new FAQ(req.body);
    await faq.save();

    res.success('FAQ created successfully', { faq }, 201);
  } catch (error) {
    res.error(error.message || 'Failed to create FAQ', 500);
  }
};

const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!faq) {
      return res.error('FAQ not found', 404);
    }

    res.success('FAQ updated successfully', { faq });
  } catch (error) {
    res.error(error.message || 'Failed to update FAQ', 500);
  }
};

const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByIdAndDelete(id);

    if (!faq) {
      return res.error('FAQ not found', 404);
    }

    res.success('FAQ deleted successfully');
  } catch (error) {
    res.error(error.message || 'Failed to delete FAQ', 500);
  }
};

const getFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find()
      .sort({ order: 1, createdAt: -1 });

    res.success('FAQs retrieved successfully', { faqs });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve FAQs', 500);
  }
};

const faqValidation = Joi.object({
  question: Joi.string().trim().required().messages({
    'string.empty': 'Question is required',
    'any.required': 'Question is required',
  }),
  answer: Joi.string().trim().required().messages({
    'string.empty': 'Answer is required',
    'any.required': 'Answer is required',
  }),
  order: Joi.number().integer().min(0).optional().messages({
    'number.min': 'Order must be a non-negative integer',
    'number.base': 'Order must be a number',
  }),
  is_active: Joi.boolean().optional().messages({
    'boolean.base': 'Is active must be a boolean',
  }),
});

module.exports = {
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getFAQs,
  faqValidation,
};

