const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    sapId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: false,
      select: false,
      default: null,
    },
    role: {
      type: String,
      enum: ['EMPLOYEE', 'ADMIN'],
      default: 'EMPLOYEE',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    seatingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeatingGroup',
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

userSchema.index({ name: 'text', sapId: 'text' });
userSchema.index({ teamId: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
