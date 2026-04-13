const express = require('express');
const { sendInvitation, acceptInvitation, rejectInvitation, deleteInvitation, requestToJoinTeam } = require('../controllers/invitation.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// ALL routes here require the user to be logged in
router.use(protect);

router.post('/send', sendInvitation);
router.post('/join-team', requestToJoinTeam);
router.post('/accept/:id', acceptInvitation);
router.post('/reject/:id', rejectInvitation);
router.delete('/:id', deleteInvitation);

module.exports = router;