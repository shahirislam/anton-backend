const express = require('express');
const router = express.Router();
const adminHelpSupportController = require('../../../controllers/admin/adminHelpSupportController');
const validate = require('../../../middleware/joiValidator');

router.get('/', adminHelpSupportController.getHelpSupport);
router.put('/', validate(adminHelpSupportController.helpSupportValidation), adminHelpSupportController.updateHelpSupport);

module.exports = router;

