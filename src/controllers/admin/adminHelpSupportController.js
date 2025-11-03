const HelpSupport = require('../../models/HelpSupport');
const Joi = require('joi');

const getHelpSupport = async (req, res) => {
  try {
    const settings = await HelpSupport.getSettings();
    
    res.success('Help & Support settings retrieved successfully', { settings });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve Help & Support settings', 500);
  }
};

const updateHelpSupport = async (req, res) => {
  try {
    const { phone, email, website, office_address } = req.body;
    const userId = req.user._id;

    // Get existing settings or create new one
    let settings = await HelpSupport.findOne();
    
    if (!settings) {
      settings = new HelpSupport({
        phone: phone || '+1 (555) 123-4567',
        email: email || 'support@tmgcompetitions.com',
        website: website || 'https://www.tmgcompetitions.com',
        office_address: office_address || '123 Main Street, City, State 12345',
        updated_by: userId,
      });
    } else {
      if (phone !== undefined) {
        settings.phone = phone;
      }
      if (email !== undefined) {
        settings.email = email;
      }
      if (website !== undefined) {
        settings.website = website;
      }
      if (office_address !== undefined) {
        settings.office_address = office_address;
      }
      settings.updated_by = userId;
    }

    await settings.save();

    res.success('Help & Support settings updated successfully', { settings });
  } catch (error) {
    res.error(error.message || 'Failed to update Help & Support settings', 500);
  }
};

const helpSupportValidation = Joi.object({
  phone: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'Phone cannot be empty',
    'string.min': 'Phone cannot be empty',
  }),
  email: Joi.string().email().lowercase().trim().optional().messages({
    'string.email': 'Valid email is required',
  }),
  website: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'Website cannot be empty',
    'string.min': 'Website cannot be empty',
  }),
  office_address: Joi.string().trim().min(1).optional().messages({
    'string.empty': 'Office address cannot be empty',
    'string.min': 'Office address cannot be empty',
  }),
});

module.exports = {
  getHelpSupport,
  updateHelpSupport,
  helpSupportValidation,
};

