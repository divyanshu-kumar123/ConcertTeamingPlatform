const express = require('express');
const { requestOtp, verifyOtp, login } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);

module.exports = router;