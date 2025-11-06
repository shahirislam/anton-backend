const TermsAndConditions = require('../../models/TermsAndConditions');
const TermsSection = require('../../models/TermsSection');
const Joi = require('joi');

const createTerms = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const latest = await TermsAndConditions.findOne().sort({ version: -1 });
    const nextVersion = latest ? latest.version + 1 : 1;

    await TermsAndConditions.updateMany({}, { is_active: false });

    const terms = new TermsAndConditions({
      ...req.body,
      version: nextVersion,
      updated_by: userId,
      is_active: true,
    });
    
    await terms.save();

    res.success('Terms & Conditions created successfully', { terms }, 201);
  } catch (error) {
    res.error(error.message || 'Failed to create Terms & Conditions', 500);
  }
};

const updateTerms = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const terms = await TermsAndConditions.findById(id);

    if (!terms) {
      return res.error('Terms & Conditions not found', 404);
    }

    if (req.body.is_active === true) {
      await TermsAndConditions.updateMany(
        { _id: { $ne: id } },
        { is_active: false }
      );
    }

    Object.assign(terms, req.body);
    terms.updated_by = userId;
    await terms.save();

    res.success('Terms & Conditions updated successfully', { terms });
  } catch (error) {
    res.error(error.message || 'Failed to update Terms & Conditions', 500);
  }
};

const deleteTerms = async (req, res) => {
  try {
    const { id } = req.params;

    const terms = await TermsAndConditions.findByIdAndDelete(id);

    if (!terms) {
      return res.error('Terms & Conditions not found', 404);
    }

    res.success('Terms & Conditions deleted successfully');
  } catch (error) {
    res.error(error.message || 'Failed to delete Terms & Conditions', 500);
  }
};

const getTerms = async (req, res) => {
  try {
    const terms = await TermsAndConditions.find()
      .populate('updated_by', 'name email')
      .sort({ version: -1 });

    res.success('Terms & Conditions retrieved successfully', { terms });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve Terms & Conditions', 500);
  }
};

const termsValidation = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'Title is required',
    'any.required': 'Title is required',
  }),
  content: Joi.string().trim().required().messages({
    'string.empty': 'Content is required',
    'any.required': 'Content is required',
  }),
  is_active: Joi.boolean().optional().messages({
    'boolean.base': 'Is active must be a boolean',
  }),
});

// ===== Terms Sections Management =====

const createTermsSection = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const section = new TermsSection({
      ...req.body,
      updated_by: userId,
      is_active: true,
    });
    
    await section.save();

    res.success('Terms section created successfully', { section }, 201);
  } catch (error) {
    res.error(error.message || 'Failed to create Terms section', 500);
  }
};

const updateTermsSection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const section = await TermsSection.findById(id);

    if (!section) {
      return res.error('Terms section not found', 404);
    }

    Object.assign(section, req.body);
    section.updated_by = userId;
    await section.save();

    res.success('Terms section updated successfully', { section });
  } catch (error) {
    res.error(error.message || 'Failed to update Terms section', 500);
  }
};

const deleteTermsSection = async (req, res) => {
  try {
    const { id } = req.params;

    const section = await TermsSection.findByIdAndDelete(id);

    if (!section) {
      return res.error('Terms section not found', 404);
    }

    res.success('Terms section deleted successfully');
  } catch (error) {
    res.error(error.message || 'Failed to delete Terms section', 500);
  }
};

const getTermsSections = async (req, res) => {
  try {
    const sections = await TermsSection.find()
      .populate('updated_by', 'name email')
      .sort({ order: 1 });

    res.success('Terms sections retrieved successfully', { sections });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve Terms sections', 500);
  }
};

const termsSectionValidation = Joi.object({
  section_title: Joi.string().trim().required().messages({
    'string.empty': 'Section title is required',
    'any.required': 'Section title is required',
  }),
  section_content: Joi.string().trim().required().messages({
    'string.empty': 'Section content is required',
    'any.required': 'Section content is required',
  }),
  order: Joi.number().integer().min(1).required().messages({
    'number.min': 'Order must be at least 1',
    'number.base': 'Order must be a number',
    'number.integer': 'Order must be an integer',
    'any.required': 'Order is required',
  }),
  is_active: Joi.boolean().optional().messages({
    'boolean.base': 'Is active must be a boolean',
  }),
});

module.exports = {
  // Legacy Terms & Conditions (single document)
  createTerms,
  updateTerms,
  deleteTerms,
  getTerms,
  termsValidation,
  // New Terms Sections
  createTermsSection,
  updateTermsSection,
  deleteTermsSection,
  getTermsSections,
  termsSectionValidation,
};

