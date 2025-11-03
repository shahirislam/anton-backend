const express = require('express');
const router = express.Router();
const adminCategoryController = require('../../../../controllers/admin/adminCategoryController');
const validateId = require('../../../../middleware/validateId');
const validate = require('../../../../middleware/joiValidator');

router.post('/', validate(adminCategoryController.categoryValidation), adminCategoryController.createCategory);
router.put('/:id', validateId(), validate(adminCategoryController.categoryValidation), adminCategoryController.updateCategory);
router.delete('/:id', validateId(), adminCategoryController.deleteCategory);

module.exports = router;

