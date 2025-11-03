const TermsAndConditions = require('../models/TermsAndConditions');

const getTerms = async (req, res) => {
  try {
    const terms = await TermsAndConditions.findOne({ is_active: true })
      .select('title content version updatedAt');

    if (!terms) {
      return res.error('Terms & Conditions not found', 404);
    }

    res.success('Terms & Conditions retrieved successfully', { terms });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve Terms & Conditions', 500);
  }
};

module.exports = {
  getTerms,
};

