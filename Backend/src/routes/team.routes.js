const express = require('express');
const { leaveTeam } = require('../controllers/team.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Apply protection middleware to all team routes
router.use(protect);

router.post('/leave', leaveTeam);

module.exports = router;