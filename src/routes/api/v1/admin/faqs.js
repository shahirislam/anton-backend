const express = require('express');
const router = express.Router();
const adminFAQController = require('../../../controllers/admin/adminFAQController');
const validateId = require('../../../middleware/validateId');
const validate = require('../../../middleware/joiValidator');

router.post('/', validate(adminFAQController.faqValidation), adminFAQController.createFAQ);
router.put('/:id', validateId(), validate(adminFAQController.faqValidation), adminFAQController.updateFAQ);
router.delete('/:id', validateId(), adminFAQController.deleteFAQ);
router.get('/', adminFAQController.getFAQs);

module.exports = router;

