const TermsAndConditions = require('../../models/TermsAndConditions');
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

module.exports = {
  createTerms,
  updateTerms,
  deleteTerms,
  getTerms,
  termsValidation,
};

