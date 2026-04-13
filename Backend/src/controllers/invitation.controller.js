const mongoose = require('mongoose');
const { User, Team, Invitation } = require('../models');

// @desc    Send an invitation (STRICTLY to Solo Employees)
// @route   POST /api/invitations/send
// @access  Private
exports.sendInvitation = async (req, res) => {
  try {
    const { targetId } = req.body; 
    const senderId = req.user._id;

    if (!targetId) return res.status(400).json({ message: 'Target ID is required.' });

    // 1. Find the target user by SAP ID
    const receiver = await User.findOne({ 
      sapId: targetId.toUpperCase(), 
      role: 'EMPLOYEE' 
    });

    if (!receiver) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // 2. STRICTOR RULE: If the target is already in a team, block immediately
    if (receiver.teamId) {
      return res.status(400).json({ message: 'This employee is already in a team. Invitations can only be sent to individuals.' });
    }

    if (senderId.toString() === receiver._id.toString()) {
      return res.status(400).json({ message: 'You cannot invite yourself.' });
    }

    // 3. Existing Invite Check
    const existingInvite = await Invitation.findOne({
      senderId, 
      receiverId: receiver._id, 
      status: 'PENDING'
    });

    if (existingInvite) {
      return res.status(400).json({ message: 'A pending request already exists.' });
    }

    // 4. Create Invitation
    const invitation = await Invitation.create({ senderId, receiverId: receiver._id });

    res.status(201).json({ message: 'Invitation sent successfully!', invitation });
  } catch (error) {
    console.error('Send Invite Error:', error);
    res.status(500).json({ message: 'Server error sending request.' });
  }
};

// @desc    Accept invitation (NO MERGING ALLOWED)
// @route   POST /api/invitations/accept/:id
// @access  Private
exports.acceptInvitation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invitationId = req.params.id;
    const receiverId = req.user._id; 

    const invitation = await Invitation.findOne({ 
      _id: invitationId, 
      receiverId, 
      status: 'PENDING' 
    }).session(session);
    
    if (!invitation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Invitation invalid or expired.' });
    }

    const sender = await User.findById(invitation.senderId).session(session);
    const receiver = await User.findById(receiverId).session(session);

    // 1. PREVENT MERGING: If both joined teams while invite was pending, reject the merge
    if (sender.teamId && receiver.teamId) {
      invitation.status = 'REJECTED'; 
      await invitation.save({ session });
      await session.commitTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Merging teams is not permitted. Both users are already in teams.' });
    }

    let finalTeamId;

    // SCENARIO A: Only Sender has a team -> Add Solo Receiver to it
    if (sender.teamId) {
      const team = await Team.findById(sender.teamId).session(session);
      team.members.push(receiverId);
      await team.save({ session });
      receiver.teamId = team._id;
      await receiver.save({ session });
      finalTeamId = team._id;
    } 
    // SCENARIO B: Only Receiver has a team -> Add Solo Sender to it
    else if (receiver.teamId) {
      const team = await Team.findById(receiver.teamId).session(session);
      team.members.push(sender._id);
      await team.save({ session });
      sender.teamId = team._id;
      await sender.save({ session });
      finalTeamId = team._id;
    } 
    // SCENARIO C: Neither has a team -> Create brand new Team
    else {
      const newTeam = await Team.create([{ members: [sender._id, receiver._id] }], { session });
      finalTeamId = newTeam[0]._id;
      sender.teamId = finalTeamId;
      receiver.teamId = finalTeamId;
      await sender.save({ session });
      await receiver.save({ session });
    }

    invitation.status = 'ACCEPTED';
    await invitation.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Invitation accepted!', teamId: finalTeamId });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Accept Error:', error);
    res.status(500).json({ message: 'Server error accepting invitation.' });
  }
};

// @desc    Reject an invitation
// @route   POST /api/invitations/reject/:id
// @access  Private
exports.rejectInvitation = async (req, res) => {
  try {
    const invitationId = req.params.id;
    const receiverId = req.user._id;

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

// @desc    Withdraw/Delete an invitation
// @route   DELETE /api/invitations/:id
// @access  Private
exports.deleteInvitation = async (req, res) => {
  try {
    const invitationId = req.params.id;
    const userId = req.user._id;

    const invitation = await Invitation.findOneAndDelete({
      _id: invitationId,
      senderId: userId
    });

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found or unauthorized.' });
    }

    res.status(200).json({ message: 'Request removed successfully.' });
  } catch (error) {
    console.error('Delete Invite Error:', error);
    res.status(500).json({ message: 'Server error removing request.' });
  }
};

// @desc    Solo employee requests to join an existing team
// @route   POST /api/invitations/join-team
// @access  Private
exports.requestToJoinTeam = async (req, res) => {
  try {
    const { targetId } = req.body; 
    const senderId = req.user._id;

    if (!targetId) return res.status(400).json({ message: 'Target ID is required.' });

    const sender = await User.findById(senderId);
    
    // STRICT RULE 1: The sender MUST be a solo employee.
    if (sender.teamId) {
      return res.status(400).json({ message: 'You are already in a team. You cannot join another.' });
    }

    const receiver = await User.findOne({ 
      sapId: targetId.toUpperCase(), 
      role: 'EMPLOYEE' 
    });

    if (!receiver) return res.status(404).json({ message: 'Employee not found.' });

    // STRICT RULE 2: The receiver MUST be part of a team.
    if (!receiver.teamId) {
      return res.status(400).json({ message: 'This person is not in a team. Please use the standard invite feature.' });
    }

    // Check for existing pending requests between these two users
    const existingInvite = await Invitation.findOne({
      $or: [
        { senderId, receiverId: receiver._id, status: 'PENDING' },
        { senderId: receiver._id, receiverId: senderId, status: 'PENDING' }
      ]
    });

    if (existingInvite) {
      return res.status(400).json({ message: 'A pending request already exists between you and this user.' });
    }

    // Create the invitation
    const invitation = await Invitation.create({ senderId, receiverId: receiver._id });
    
    res.status(201).json({ message: 'Request to join the team sent successfully!', invitation });
  } catch (error) {
    console.error('Join Team Request Error:', error);
    res.status(500).json({ message: 'Server error sending join request.' });
  }
};