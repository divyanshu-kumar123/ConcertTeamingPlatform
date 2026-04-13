const mongoose = require('mongoose');
const { User, Team, Invitation } = require('../models');

// @desc    Send an invitation (By SAP ID) or Join Request (By Team ID)
// @route   POST /api/invitations/send
// @access  Private
exports.sendInvitation = async (req, res) => {
  try {
    // We change this to 'targetId' because it can now be an SAP ID OR a Team ID
    const { targetId } = req.body; 
    const senderId = req.user._id;

    if (!targetId) {
      return res.status(400).json({ message: 'Please provide an SAP ID or Team ID.' });
    }

    let receiverId = null;

    // --- SMART ROUTING LOGIC ---

    // 1. Is it a Team ID? (Check if it's a valid 24-char MongoDB ID)
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      const team = await Team.findById(targetId);
      if (team) {
        // Prevent sending request if already in THIS team
        if (req.user.teamId && req.user.teamId.toString() === targetId) {
          return res.status(400).json({ message: 'You are already a member of this team.' });
        }
        // To join a team, we send the invite to the first member of that team
        receiverId = team.members[0];
      }
    }

    // 2. Is it an SAP ID? (If it wasn't a Team ID, search the Users collection)
    if (!receiverId) {
      // Ensure we convert it to uppercase just in case they typed 'sap123'
      const user = await User.findOne({ sapId: targetId.toUpperCase(), role: 'EMPLOYEE' });
      if (user) {
        receiverId = user._id;
      }
    }

    // 3. If we still don't have a receiver, the input was completely invalid
    if (!receiverId) {
      return res.status(404).json({ message: 'No Employee or Team found with that ID.' });
    }

    // --- STANDARD SAFETY CHECKS ---

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ message: 'You cannot invite yourself.' });
    }

    const receiver = await User.findById(receiverId);

    // Check if they are already in the same team
    if (req.user.teamId && receiver.teamId && req.user.teamId.toString() === receiver.teamId.toString()) {
      return res.status(400).json({ message: 'This employee is already in your team.' });
    }

    // Check if a pending invite already exists between them
    const existingInvite = await Invitation.findOne({
      $or: [
        { senderId, receiverId, status: 'PENDING' },
        { senderId: receiverId, receiverId: senderId, status: 'PENDING' }
      ]
    });

    if (existingInvite) {
      return res.status(400).json({ message: 'A pending request already exists between you and this target.' });
    }

    // --- CREATE INVITATION ---
    const invitation = await Invitation.create({ senderId, receiverId });

    res.status(201).json({ message: 'Request sent successfully!', invitation });
  } catch (error) {
    console.error('Send Invite Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already sent a request here.' });
    }
    res.status(500).json({ message: 'Server error sending request.' });
  }
};

// @desc    Accept an invitation and merge teams
// @route   POST /api/invitations/accept/:id
// @access  Private
exports.acceptInvitation = async (req, res) => {
  // START A MONGODB TRANSACTION
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invitationId = req.params.id;
    // FIX 1: Safely grab the ID whether your auth middleware uses ._id or .id
    const receiverId = req.user._id || req.user.id; 

    // FIX 2: Check the URL param to prevent Mongoose cast errors
    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid invitation ID format.' });
    }

    const invitation = await Invitation.findOne({ _id: invitationId, receiverId, status: 'PENDING' }).session(session);
    
    if (!invitation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Invitation not found or already processed.' });
    }

    // --- We removed the buggy 'isValid(receiverId)' check that was crashing your app! ---

    const sender = await User.findById(invitation.senderId).session(session);
    const receiver = await User.findById(receiverId).session(session);

    let finalTeamId;

    // SCENARIO 1: Both users already have teams -> Merge Teams
    if (sender.teamId && receiver.teamId) {
      if (sender.teamId.toString() !== receiver.teamId.toString()) {
        const senderTeam = await Team.findById(sender.teamId).session(session);
        const receiverTeam = await Team.findById(receiver.teamId).session(session);

        // Move everyone from sender's team into receiver's team
        receiverTeam.members.push(...senderTeam.members);
        await receiverTeam.save({ session });

        // Update all users from the sender's old team to point to the receiver's team
        await User.updateMany(
          { teamId: sender.teamId },
          { $set: { teamId: receiverTeam._id } },
          { session }
        );

        // Delete the now-empty sender's team
        await Team.findByIdAndDelete(sender.teamId).session(session);
        finalTeamId = receiverTeam._id;
      }
    } 
    // SCENARIO 2: Only Sender has a team -> Add Receiver to Sender's Team
    else if (sender.teamId) {
      const team = await Team.findById(sender.teamId).session(session);
      team.members.push(receiverId);
      await team.save({ session });
      
      receiver.teamId = team._id;
      await receiver.save({ session });
      finalTeamId = team._id;
    } 
    // SCENARIO 3: Only Receiver has a team -> Add Sender to Receiver's Team
    else if (receiver.teamId) {
      const team = await Team.findById(receiver.teamId).session(session);
      team.members.push(sender._id);
      await team.save({ session });
      
      sender.teamId = team._id;
      await sender.save({ session });
      finalTeamId = team._id;
    } 
    // SCENARIO 4: Neither has a team -> Create a brand new Team
    else {
      const newTeam = await Team.create([{ members: [sender._id, receiver._id] }], { session });
      finalTeamId = newTeam[0]._id; // .create with session returns an array

      sender.teamId = finalTeamId;
      receiver.teamId = finalTeamId;
      await sender.save({ session });
      await receiver.save({ session });
    }

    // Mark the invitation as accepted
    invitation.status = 'ACCEPTED';
    await invitation.save({ session });

    // COMMIT THE TRANSACTION
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Invitation accepted! You are now teammates.', teamId: finalTeamId });

  } catch (error) {
    // IF ANYTHING FAILS, ROLLBACK ALL CHANGES
    await session.abortTransaction();
    session.endSession();
    console.error('Accept Invite Error:', error);
    res.status(500).json({ message: 'Server error accepting invitation.' });
  }
};

// @desc    Reject an invitation
// @route   POST /api/invitations/reject/:id
// @access  Private
exports.rejectInvitation = async (req, res) => {
  try {
    const invitationId = req.params.id;
    // FIX: Safely grab the receiver ID here as well
    const receiverId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({ message: 'Invalid invitation ID format.' });
    }

    const invitation = await Invitation.findOneAndUpdate(
      { _id: invitationId, receiverId, status: 'PENDING' },
      { status: 'REJECTED' },
      { new: true }
    );

    if (!invitation) {
      return res.status(404).json({ message: 'Pending invitation not found.' });
    }

    res.status(200).json({ message: 'Invitation rejected.' });
  } catch (error) {
    console.error('Reject Invite Error:', error);
    res.status(500).json({ message: 'Server error rejecting invitation.' });
  }
};


// @desc    Withdraw a pending invite or clear a rejected invite
// @route   DELETE /api/invitations/:id
// @access  Private
exports.deleteInvitation = async (req, res) => {
  try {
    const invitationId = req.params.id;
    const userId = req.user._id || req.user.id; // Support both token extraction styles

    // 1. Validate the ID format to prevent Mongoose crashes
    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({ message: 'Invalid invitation ID format.' });
    }

    // 2. Find and delete the invitation ONLY if the logged-in user is the sender
    const invitation = await Invitation.findOneAndDelete({
      _id: invitationId,
      senderId: userId
    });

    if (!invitation) {
      return res.status(404).json({ 
        message: 'Invitation not found, or you do not have permission to delete it.' 
      });
    }

    res.status(200).json({ message: 'Request removed successfully.' });
    
  } catch (error) {
    console.error('Delete Invite Error:', error);
    res.status(500).json({ message: 'Server error removing the request.' });
  }
};