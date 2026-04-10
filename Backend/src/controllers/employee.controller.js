const { User, Team, Invitation } = require('../models');

// @desc    Get current user profile, team, and invites
// @route   GET /api/employees/me
// @access  Private (Requires Token)
exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id; // Extracted from JWT token by auth middleware

    // 1. Get pending received invitations
    const receivedInvitations = await Invitation.find({ receiverId: userId, status: 'PENDING' })
      .populate('senderId', 'name sapId'); // Bring in the sender's details

    // 2. Get pending sent invitations
    const sentInvitations = await Invitation.find({ senderId: userId, status: 'PENDING' })
      .populate('receiverId', 'name sapId'); // Bring in the receiver's details

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

// @desc    Search employees by name or SAP ID
// @route   GET /api/employees/search?query=...
// @access  Private (Requires Token)
exports.searchEmployees = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required.' });
    }

    // Use a case-insensitive regex for "typeahead" partial matching
    const regex = new RegExp(query, 'i');
    
    const employees = await User.find({
      _id: { $ne: req.user._id }, // Do NOT return the logged-in user in their own search
      role: 'EMPLOYEE',
      $or: [{ name: regex }, { sapId: regex }]
    })
    .select('name sapId teamId') // Only send safe data to the frontend
    .limit(10); // Limit to 10 results for performance

    res.status(200).json(employees);
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ message: 'Server error during search.' });
  }
};