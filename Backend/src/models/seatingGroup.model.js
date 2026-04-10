const mongoose = require('mongoose');

const seatingGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      uppercase: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
    },
    allocatedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);


const SeatingGroup = mongoose.model('SeatingGroup', seatingGroupSchema);

module.exports = SeatingGroup;
