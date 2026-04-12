const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { User, Otp } = require('../models');
const generateToken = require('../utils/generateToken');
const { emailQueue } = require('../jobs/emailQueue');

// @desc    Register / Request OTP
// @route   POST /api/auth/request-otp
// @access  Public
exports.requestOtp = async (req, res) => {
  try {
    const { sapId, email, password } = req.body;

    if (!sapId || !email || !password) {
      return res.status(400).json({ message: 'Please provide SAP ID, email, and password.' });
    }

    // 1. Check if user exists in the pre-loaded list
    const user = await User.findOne({ sapId });
    if (!user) {
      return res.status(404).json({ message: 'SAP ID not found in the pre-registered employee list.' });
    }

    // ==========================================
    // --- NEW SECURITY CHECK: VERIFY EMAIL ---
    // ==========================================
    const cleanInputEmail = email.trim().toLowerCase();
    const dbEmail = user.email ? user.email.trim().toLowerCase() : null;

    if (!dbEmail || dbEmail !== cleanInputEmail) {
      return res.status(403).json({ 
        message: 'Security Alert: The email provided does not match the official corporate email linked to this SAP ID.' 
      });
    }
    // ==========================================

    // 2. Check if already verified
    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already registered and verified. Please login.' });
    }

    // 3. Check if email is already taken by ANOTHER verified user
    const emailExists = await User.findOne({ email: cleanInputEmail, sapId: { $ne: sapId }, isVerified: true });
    if (emailExists) {
      return res.status(400).json({ message: 'This email is already registered to another SAP ID.' });
    }

    // 4. Update user with email and hashed password (temporarily unverified)
    const salt = await bcrypt.genSalt(10);
    user.email = cleanInputEmail; // saved as clean lowercase
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    // 5. Generate 6-digit OTP and hash it
    const plainOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(plainOtp, salt);

    // 6. Save OTP to DB (upsert to overwrite any previous unexpired OTPs for this user)
    await Otp.findOneAndUpdate(
      { sapId },
      { 
        sapId, 
        email: cleanInputEmail, 
        otpHash, 
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
      },
      { upsert: true, new: true }
    );

    // 7. Add job to Redis Queue for async email sending
    await emailQueue.add('send-otp', { email: cleanInputEmail, otp: plainOtp });

    res.status(200).json({ message: 'OTP sent to your email successfully.' });

  } catch (error) {
    console.error('Request OTP Error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// @desc    Verify OTP and Complete Registration
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const { sapId, otp } = req.body;

    if (!sapId || !otp) {
      return res.status(400).json({ message: 'Please provide SAP ID and OTP.' });
    }

    // 1. Find OTP record
    const otpRecord = await Otp.findOne({ sapId }).select('+otpHash');
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
    }

    // 2. Verify Hash
    const isMatch = await bcrypt.compare(String(otp), otpRecord.otpHash);
    if (!isMatch) {
      // Optional: You can increment retryCount here based on your schema
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // 3. Mark User as Verified
    const user = await User.findOneAndUpdate(
      { sapId },
      { isVerified: true },
      { new: true }
    );

    // 4. Delete OTP record
    await Otp.deleteOne({ sapId });

    // 5. Generate JWT Token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: 'Registration successful!',
      token,
      user: { id: user._id, sapId: user.sapId, name: user.name, role: user.role, teamId: user.teamId }
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ message: 'Server error during OTP verification.' });
  }
};

// @desc    Login for Employees and Admin
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { sapId, password } = req.body;

    if (!sapId || !password) {
      return res.status(400).json({ message: 'Please provide SAP ID and password.' });
    }

    // Find user and explicitly select the password field (since it is select: false in schema)
    const user = await User.findOne({ sapId }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    if (!user.password) {
      return res.status(401).json({ message: 'Account not set up. Please register via OTP first.' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please complete your registration (verify OTP) first.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: { id: user._id, sapId: user.sapId, name: user.name, role: user.role, teamId: user.teamId }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};