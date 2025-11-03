const express = require('express');
const router = express.Router();
const resultController = require('../../../controllers/resultController');
const validateId = require('../../../middleware/validateId');

router.get('/', resultController.getResults);
router.get('/:id', validateId(), resultController.getResultById);

module.exports = router;

