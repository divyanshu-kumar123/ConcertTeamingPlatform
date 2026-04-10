const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

invitationSchema.index({ receiverId: 1, status: 1 });
invitationSchema.index({ senderId: 1, status: 1 });
invitationSchema.index(
  { senderId: 1, receiverId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'PENDING' },
  }
);

const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = Invitation;
