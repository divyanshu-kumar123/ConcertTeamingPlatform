const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    seatingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeatingGroup',
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

teamSchema.index({ members: 1 });
teamSchema.index({ seatingGroupId: 1 });

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
