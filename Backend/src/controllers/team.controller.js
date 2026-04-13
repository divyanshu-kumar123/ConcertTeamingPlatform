const mongoose = require('mongoose');
const { User, Team } = require('../models');

// @desc    Leave the current team
// @route   POST /api/teams/leave
// @access  Private
exports.leaveTeam = async (req, res) => {
  // We use a session for a Transaction to ensure data integrity
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).session(session);

    // 1. Validation: Ensure user is actually in a team
    if (!user || !user.teamId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'You are not currently part of any team.' });
    }

    const teamId = user.teamId;
    const team = await Team.findById(teamId).session(session);

    if (team) {
      // 2. Remove user from the Team's members array
      team.members = team.members.filter(
        (memberId) => memberId.toString() !== userId.toString()
      );

      // 3. Scalable Logic: If no members are left, delete the Team
      if (team.members.length === 0) {
        await Team.findByIdAndDelete(teamId).session(session);
        console.log(`[System] Team ${teamId} deleted as the last member left.`);
      } else {
        await team.save({ session });
      }
    }

    // 4. Update the User record to remove the team reference
    user.teamId = null;
    await user.save({ session });

    // Everything succeeded, commit the changes to the database
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Successfully left the team.' });

  } catch (error) {
    // If anything fails, undo every change made during this session
    await session.abortTransaction();
    session.endSession();
    console.error('Leave Team Error:', error);
    res.status(500).json({ message: 'Server error while processing leave request.' });
  }
};