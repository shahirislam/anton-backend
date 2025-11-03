const FAQ = require('../models/FAQ');

const getFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find({ is_active: true })
      .select('question answer order')
      .sort({ order: 1, createdAt: -1 });

    res.success('FAQs retrieved successfully', { faqs });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve FAQs', 500);
  }
};

module.exports = {
  getFAQs,
};

