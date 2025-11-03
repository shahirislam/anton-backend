const express = require('express');
const router = express.Router();
const adminCompetitionController = require('../../../../controllers/admin/adminCompetitionController');
const validateId = require('../../../../middleware/validateId');
const validate = require('../../../../middleware/joiValidator');
const { createUploadMiddleware } = require('../../../../middleware/uploadMiddleware');

const uploadCompetitionImage = createUploadMiddleware('competitions', 'image');

router.post('/', uploadCompetitionImage, validate(adminCompetitionController.competitionValidation), adminCompetitionController.createCompetition);
router.put('/:id', validateId(), uploadCompetitionImage, validate(adminCompetitionController.competitionValidation), adminCompetitionController.updateCompetition);
router.patch('/:id', validateId(), uploadCompetitionImage, validate(adminCompetitionController.updateCompetitionPartialValidation), adminCompetitionController.updateCompetition);
router.delete('/:id', validateId(), adminCompetitionController.deleteCompetition);
router.get('/', adminCompetitionController.getCompetitions);

module.exports = router;

