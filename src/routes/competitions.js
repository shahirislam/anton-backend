const express = require('express');
const router = express.Router();
const competitionController = require('../controllers/competitionController');
const validateId = require('../middleware/validateId');

router.get('/', competitionController.getCompetitions);
router.get('/recent', competitionController.getRecentCompetitions);
router.get('/search', competitionController.searchCompetitions);
router.get('/:id', validateId(), competitionController.getCompetitionById);

module.exports = router;

