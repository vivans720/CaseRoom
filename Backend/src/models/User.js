const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
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
      lowercase: true,
      trim: true,
      match: [
        /^[\w\+\.-]+@[\w\.-]+\.\w{2,}$/,
        "Please fill a valid email address",
      ],
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    profilePictureUrl: {
      type: String,
      default: null,
      trim: true,
    },
    profilePicturePublicId: {
      type: String,
      default: null,
      trim: true,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    pinnedCases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Case",
      },
    ],
    roleName: {
      type: String,
      default: "",
      trim: true,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
