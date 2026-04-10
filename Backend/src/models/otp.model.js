const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    sapId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
