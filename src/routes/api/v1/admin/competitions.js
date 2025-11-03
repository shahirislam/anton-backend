const express = require('express');
const router = express.Router();
const adminCompetitionController = require('../../../controllers/admin/adminCompetitionController');
const validateId = require('../../../middleware/validateId');
const validate = require('../../../middleware/joiValidator');

router.post('/', validate(adminCompetitionController.competitionValidation), adminCompetitionController.createCompetition);
router.put('/:id', validateId(), validate(adminCompetitionController.competitionValidation), adminCompetitionController.updateCompetition);
router.patch('/:id', validateId(), validate(adminCompetitionController.updateCompetitionPartialValidation), adminCompetitionController.updateCompetition);
router.delete('/:id', validateId(), adminCompetitionController.deleteCompetition);
router.get('/', adminCompetitionController.getCompetitions);

module.exports = router;

