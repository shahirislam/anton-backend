const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const validateId = require('../middleware/validateId');
const validateRequest = require('../middleware/validateRequest');

router.use(authMiddleware);
router.use(isAdmin);

const adminCompetitionController = require('../controllers/admin/adminCompetitionController');
const adminTicketController = require('../controllers/admin/adminTicketController');
const adminResultController = require('../controllers/admin/adminResultController');
const adminNotificationController = require('../controllers/admin/adminNotificationController');
const adminPointsController = require('../controllers/admin/adminPointsController');
const adminUserController = require('../controllers/admin/adminUserController');
const adminCategoryController = require('../controllers/admin/adminCategoryController');
const adminDashboardController = require('../controllers/admin/adminDashboardController');

router.post('/competitions', adminCompetitionController.competitionValidation, validateRequest, adminCompetitionController.createCompetition);
router.put('/competitions/:id', validateId(), adminCompetitionController.competitionValidation, validateRequest, adminCompetitionController.updateCompetition);
router.delete('/competitions/:id', validateId(), adminCompetitionController.deleteCompetition);
router.get('/competitions', adminCompetitionController.getCompetitions);

router.get('/tickets', adminTicketController.getTickets);
router.get('/tickets/:competition_id', validateId('competition_id'), adminTicketController.getTicketsByCompetition);
router.delete('/tickets/:id', validateId(), adminTicketController.deleteTicket);

router.post('/results', adminResultController.resultValidation, validateRequest, adminResultController.createResult);
router.put('/results/:id', validateId(), adminResultController.resultValidation, validateRequest, adminResultController.updateResult);
router.get('/results', adminResultController.getResults);

router.post('/notifications', adminNotificationController.notificationValidation, validateRequest, adminNotificationController.createNotification);
router.get('/notifications', adminNotificationController.getNotifications);

router.post('/points/add', adminPointsController.pointsValidation, validateRequest, adminPointsController.addPoints);
router.post('/points/deduct', adminPointsController.pointsValidation, validateRequest, adminPointsController.deductPoints);

router.get('/users', adminUserController.getUsers);
router.get('/users/:id', validateId(), adminUserController.getUserById);
router.put('/users/:id', validateId(), adminUserController.updateUserValidation, validateRequest, adminUserController.updateUser);
router.delete('/users/:id', validateId(), adminUserController.deleteUser);

router.post('/categories', adminCategoryController.categoryValidation, validateRequest, adminCategoryController.createCategory);
router.put('/categories/:id', validateId(), adminCategoryController.categoryValidation, validateRequest, adminCategoryController.updateCategory);
router.delete('/categories/:id', validateId(), adminCategoryController.deleteCategory);

router.get('/dashboard', adminDashboardController.getDashboard);

module.exports = router;

