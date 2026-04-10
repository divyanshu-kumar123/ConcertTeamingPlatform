const express = require('express');
const { sendInvitation, acceptInvitation, rejectInvitation } = require('../controllers/invitation.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// ALL routes here require the user to be logged in
router.use(protect);

router.post('/send', sendInvitation);
router.post('/accept/:id', acceptInvitation);
router.post('/reject/:id', rejectInvitation);

module.exports = router;