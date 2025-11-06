const TermsAndConditions = require('../models/TermsAndConditions');
const TermsSection = require('../models/TermsSection');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

// Get list of all sections with their order (lightweight - no content)
const getTermsSections = async (req, res) => {
  try {
    const sections = await TermsSection.find({ is_active: true })
      .select('section_title order _id')
      .sort({ order: 1 });

    if (!sections || sections.length === 0) {
      return res.error('Terms & Conditions sections not found', 404);
    }

    res.success('Terms & Conditions sections retrieved successfully', {
      sections: sections.map(s => ({
        id: s._id,
        title: s.section_title,
        order: s.order,
      })),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve Terms & Conditions sections', 500);
  }
};

// Get a specific section by ID
const getTermsSectionById = async (req, res) => {
  try {
    const { id } = req.params;

    const section = await TermsSection.findOne({ _id: id, is_active: true })
      .select('section_title section_content order updatedAt');

    if (!section) {
      return res.error('Terms & Conditions section not found', 404);
    }

    res.success('Terms & Conditions section retrieved successfully', {
      section: {
        id: section._id,
        title: section.section_title,
        content: section.section_content,
        order: section.order,
        updatedAt: section.updatedAt,
      },
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve Terms & Conditions section', 500);
  }
};

// Get all sections with pagination (for loading sections progressively)
const getTermsSectionsPaginated = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const sections = await TermsSection.find({ is_active: true })
      .select('section_title section_content order _id')
      .sort({ order: 1 })
      .skip(skip)
      .limit(limit);

    const total = await TermsSection.countDocuments({ is_active: true });

    if (!sections || sections.length === 0) {
      return res.error('Terms & Conditions sections not found', 404);
    }

    res.success('Terms & Conditions sections retrieved successfully', {
      sections: sections.map(s => ({
        id: s._id,
        title: s.section_title,
        content: s.section_content,
        order: s.order,
      })),
      pagination: getPaginationMeta(page, limit, total),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve Terms & Conditions sections', 500);
  }
};

// Legacy endpoint - get all sections at once (for backward compatibility)
const getTerms = async (req, res) => {
  try {
    const sections = await TermsSection.find({ is_active: true })
      .select('section_title section_content order _id')
      .sort({ order: 1 });

    if (!sections || sections.length === 0) {
      return res.error('Terms & Conditions not found', 404);
    }

    res.success('Terms & Conditions retrieved successfully', {
      sections: sections.map(s => ({
        id: s._id,
        title: s.section_title,
        content: s.section_content,
        order: s.order,
      })),
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve Terms & Conditions', 500);
  }
};

module.exports = {
  getTerms,
  getTermsSections,
  getTermsSectionById,
  getTermsSectionsPaginated,
};

