const mongoose = require('mongoose');
const { User, Team, Invitation } = require('../models');

// @desc    Send an invitation to another employee
// @route   POST /api/invitations/send
// @access  Private
exports.sendInvitation = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (senderId.toString() === receiverId) {
      return res.status(400).json({ message: 'You cannot invite yourself.' });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: 'Invalid employee ID format.' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver || receiver.role !== 'EMPLOYEE') {
      return res.status(404).json({ message: 'Employee not found.' });
    }

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
      return res.status(400).json({ message: 'A pending invitation already exists between you two.' });
    }

    const invitation = await Invitation.create({ senderId, receiverId });

    res.status(201).json({ message: 'Invitation sent successfully!', invitation });
  } catch (error) {
    console.error('Send Invite Error:', error);
    // 11000 is the MongoDB duplicate key error (which our unique index catches)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already sent an invitation to this user.' });
    }
    res.status(500).json({ message: 'Server error sending invitation.' });
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
    const receiverId = req.user._id; // The person clicking "Accept"

    const invitation = await Invitation.findOne({ _id: invitationId, receiverId, status: 'PENDING' }).session(session);
    if (!invitation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Invitation not found or already processed.' });
    }
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: 'Invalid employee ID format.' });
    }

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