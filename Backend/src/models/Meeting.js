const mongoose = require("mongoose");
require("./User");

const meetingParticipantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const meetingSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: true,
      index: true,
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    participants: [meetingParticipantSchema],
  },
  {
    timestamps: true,
  },
);

// Enforce one active meeting per case at database level
meetingSchema.index(
  { caseId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
  },
);

const Meeting = mongoose.model("Meeting", meetingSchema);

module.exports = Meeting;
