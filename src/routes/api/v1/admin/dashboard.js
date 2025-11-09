const express = require('express');
const router = express.Router();
const adminDashboardController = require('../../../../controllers/admin/adminDashboardController');

router.get('/', adminDashboardController.getDashboard);
router.get('/stats', adminDashboardController.getDashboardStats);
router.get('/revenue', adminDashboardController.getRevenue);
router.get('/competition-status', adminDashboardController.getCompetitionStatus);
router.get('/user-activity', adminDashboardController.getUserActivity);

module.exports = router;

