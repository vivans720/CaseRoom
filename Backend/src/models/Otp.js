const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    type: { type: String, enum: ["registration", "login", "reset_password"], required: true },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // Default 5 minutes from now
    },
  },
  {
    timestamps: true,
  }
);

// TTL Index: This will automatically delete the document when expiresAt time is reached
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ensure email is indexed for faster lookups
OtpSchema.index({ email: 1 });

module.exports = mongoose.model("Otp", OtpSchema);
