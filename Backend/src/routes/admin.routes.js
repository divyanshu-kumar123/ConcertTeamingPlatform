const express = require('express');
const { 
  getAdminDashboard, 
  assignTeamToGroup, 
  autoAllocateSeats,
  exportSeatingData,
  getGroupOccupants
} = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');

const router = express.Router();

// ALL routes here require the user to be logged in AND be an Admin
router.use(protect, adminOnly);

router.get('/dashboard', getAdminDashboard);
router.post('/assign-team', assignTeamToGroup);
router.post('/auto-allocate', autoAllocateSeats);
router.get('/export', exportSeatingData);
router.get('/groups/:id/occupants', getGroupOccupants);

module.exports = router;