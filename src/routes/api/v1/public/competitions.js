const express = require('express');
const router = express.Router();
const competitionController = require('../../../../controllers/competitionController');
const validateId = require('../../../../middleware/validateId');
const authMiddleware = require('../../../../middleware/authMiddleware');
const optionalAuthMiddleware = require('../../../../middleware/optionalAuthMiddleware');

router.get('/', competitionController.getCompetitions);
router.get('/recent', optionalAuthMiddleware, competitionController.getRecentCompetitions);
router.get('/search', competitionController.searchCompetitions);

router.get('/my', authMiddleware, competitionController.getMyCompetitions);
router.get('/favorites/my', authMiddleware, competitionController.getMyFavorites);
router.post('/:id/favorite', authMiddleware, validateId(), competitionController.addFavorite);
router.delete('/:id/favorite', authMiddleware, validateId(), competitionController.removeFavorite);

router.get('/:id', validateId(), optionalAuthMiddleware, competitionController.getCompetitionById);

module.exports = router;

