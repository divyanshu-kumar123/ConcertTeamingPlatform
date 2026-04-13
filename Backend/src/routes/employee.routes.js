const express = require('express');
const { getDashboardData, searchEmployees, searchTeamsToJoin } = require('../controllers/employee.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// ALL routes in this file are protected by the JWT middleware
router.use(protect);

router.get('/me', getDashboardData);
router.get('/search', searchEmployees);
router.get('/search-teams', searchTeamsToJoin);

module.exports = router;