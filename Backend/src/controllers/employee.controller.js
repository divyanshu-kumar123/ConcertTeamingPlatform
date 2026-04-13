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



// @desc    Search employees by name or SAP ID
// @route   GET /api/employees/search?query=...
// @access  Private (Requires Token)
exports.searchEmployees = async (req, res) => {
  try {
    const { query } = req.query;

    // PRO-TIP: Return an empty array instead of a 400 error. 
    // If you return 400, the frontend will flash an error toast every time the user clears the search box!
    if (!query || query.length < 3) {
      return res.status(200).json([]);
    }

    // Use a case-insensitive regex for "typeahead" partial matching
    const regex = new RegExp(query, 'i');
    
    const employees = await User.find({
      _id: { $ne: req.user._id }, // PERFECT: Do NOT return the logged-in user
      role: 'EMPLOYEE',
      $or: [{ name: regex }, { sapId: regex }]
    })
    .select('_id name sapId teamId') // Explicitly include _id because React needs it for the 'key' prop
    .limit(10); 

    res.status(200).json(employees);
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ message: 'Server error during search.' });
  }
};