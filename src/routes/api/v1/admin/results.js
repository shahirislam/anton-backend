const express = require('express');
const router = express.Router();
const adminResultController = require('../../../controllers/admin/adminResultController');
const validateId = require('../../../middleware/validateId');
const validate = require('../../../middleware/joiValidator');

router.post('/', validate(adminResultController.resultValidation), adminResultController.createResult);
router.put('/:id', validateId(), validate(adminResultController.resultValidation), adminResultController.updateResult);
router.get('/', adminResultController.getResults);

module.exports = router;

