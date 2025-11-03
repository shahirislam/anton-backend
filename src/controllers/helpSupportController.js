const HelpSupport = require('../models/HelpSupport');

const getHelpSupport = async (req, res) => {
  try {
    const settings = await HelpSupport.getSettings();
    
    // Return only public information (exclude admin fields)
    res.success('Help & Support information retrieved successfully', {
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      office_address: settings.office_address,
    });
  } catch (error) {
    res.error(error.message || 'Failed to retrieve Help & Support information', 500);
  }
};

module.exports = {
  getHelpSupport,
};

