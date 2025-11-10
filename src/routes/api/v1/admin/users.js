const express = require('express');
const router = express.Router();
const adminUserController = require('../../../../controllers/admin/adminUserController');
const validateId = require('../../../../middleware/validateId');
const validate = require('../../../../middleware/joiValidator');

router.get('/', adminUserController.getUsers);
router.get('/:id', validateId(), adminUserController.getUserById);
router.put('/:id/suspend', validateId(), adminUserController.suspendUser);
router.put('/:id/reactivate', validateId(), adminUserController.reactivateUser);
router.put('/:id', validateId(), validate(adminUserController.updateUserValidation), adminUserController.updateUser);
router.delete('/:id', validateId(), adminUserController.deleteUser);

module.exports = router;

