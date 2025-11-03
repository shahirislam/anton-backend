const express = require('express');
const router = express.Router();
const adminDashboardController = require('../../../controllers/admin/adminDashboardController');

router.get('/', adminDashboardController.getDashboard);

module.exports = router;

