const express = require('express');
const router = express.Router();
const adminTermsController = require('../../../controllers/admin/adminTermsController');
const validateId = require('../../../middleware/validateId');
const validate = require('../../../middleware/joiValidator');

router.post('/', validate(adminTermsController.termsValidation), adminTermsController.createTerms);
router.put('/:id', validateId(), validate(adminTermsController.termsValidation), adminTermsController.updateTerms);
router.delete('/:id', validateId(), adminTermsController.deleteTerms);
router.get('/', adminTermsController.getTerms);

module.exports = router;

