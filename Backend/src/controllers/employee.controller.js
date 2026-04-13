const { User, Team, Invitation } = require('../models');
const mongoose = require('mongoose');


// @desc    Get current user profile, team, and invites
// @route   GET /api/employees/me
// @access  Private (Requires Token)
exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id; // Extracted from JWT token by auth middleware

    // 1. Get pending received invitations
    const receivedInvitations = await Invitation.find({ receiverId: userId, status: 'PENDING' })
      .populate('senderId', 'name sapId'); // Bring in the sender's details

// 2. Get pending and rejected sent invitations
    const sentInvitations = await Invitation.find({ 
      senderId: userId, 
      status: { $in: ['PENDING', 'REJECTED'] } 
    }).populate('receiverId', 'name sapId');

    // 3. Get Team info if they belong to one
    let team = null;
    if (req.user.teamId) {
      team = await Team.findById(req.user.teamId).populate('members', 'name sapId');
    }

    res.status(200).json({
      user: { id: req.user._id, sapId: req.user.sapId, name: req.user.name },
      team,
      receivedInvitations,
      sentInvitations
    });
  } catch (error) {
    console.error('Dashboard Data Error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data.' });
  }
};



// @desc    Search ONLY solo employees by name or SAP ID
// @route   GET /api/employees/search?query=...
exports.searchEmployees = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 3) {
      return res.status(200).json([]);
    }

    const regex = new RegExp(query, 'i');
    
    const employees = await User.find({
      _id: { $ne: req.user._id }, 
      role: 'EMPLOYEE',
      teamId: null, 
      $or: [{ name: regex }, { sapId: regex }]
    })
    .select('_id name sapId teamId') 
    .limit(10); 

    res.status(200).json(employees);
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ message: 'Server error during search.' });
  }
};


// @desc    Search ONLY for existing teams (by member name, SAP ID, or exact Team Code)
// @route   GET /api/employees/search-teams?query=...
// @access  Private
exports.searchTeamsToJoin = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 3) {
      return res.status(200).json([]);
    }

    const regex = new RegExp(query, 'i');
    const isQueryObjectId = mongoose.Types.ObjectId.isValid(query);

    const employees = await User.find({
      _id: { $ne: req.user._id }, // Don't return the logged-in user
      role: 'EMPLOYEE',
      teamId: { $ne: null }, // CRITICAL RULE: Only return people who ARE in a team
      $or: [
        { name: regex },
        { sapId: regex },
        // If they paste an exact 24-char Team Code, it will find members of that team
        ...(isQueryObjectId ? [{ teamId: query }] : [])
      ]
    })
    .select('_id name sapId teamId') // MUST USE SPACES, NO COMMAS
    .limit(10);

    res.status(200).json(employees);
  } catch (error) {
    console.error('Search Teams Error:', error);
    res.status(500).json({ message: 'Server error during team search.' });
  }
};