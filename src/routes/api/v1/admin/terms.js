const express = require('express');
const router = express.Router();
const adminTermsController = require('../../../../controllers/admin/adminTermsController');
const validateId = require('../../../../middleware/validateId');
const validate = require('../../../../middleware/joiValidator');

// Legacy Terms & Conditions endpoints (single document)
router.post('/', validate(adminTermsController.termsValidation), adminTermsController.createTerms);
router.put('/:id', validateId(), validate(adminTermsController.termsValidation), adminTermsController.updateTerms);
router.delete('/:id', validateId(), adminTermsController.deleteTerms);
router.get('/', adminTermsController.getTerms);

// New Terms Sections endpoints
router.post('/sections', validate(adminTermsController.termsSectionValidation), adminTermsController.createTermsSection);
router.put('/sections/:id', validateId(), validate(adminTermsController.termsSectionValidation), adminTermsController.updateTermsSection);
router.delete('/sections/:id', validateId(), adminTermsController.deleteTermsSection);
router.get('/sections', adminTermsController.getTermsSections);

module.exports = router;

