const express = require('express');
const router = express.Router();
const termsController = require('../../../../controllers/termsController');
const validateId = require('../../../../middleware/validateId');

// Get list of all sections (lightweight - titles and order only)
router.get('/sections', termsController.getTermsSections);

// Get paginated sections (for progressive loading)
router.get('/sections/paginated', termsController.getTermsSectionsPaginated);

// Get a specific section by ID
router.get('/sections/:id', validateId(), termsController.getTermsSectionById);

// Legacy endpoint - get all sections at once (for backward compatibility)
router.get('/', termsController.getTerms);

module.exports = router;

