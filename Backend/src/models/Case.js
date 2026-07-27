const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Under Review", "Resolved", "Closed", "active", "archived"],
      default: "Open",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    category: {
      type: String,
      enum: ["Incident", "Legal", "HR", "Engineering"],
      default: "Incident",
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          index: true,
        },
        role: {
          type: String,
          enum: ["Admin", "Editor", "Observer"],
          default: "Editor",
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

caseSchema.index({ title: "text", description: "text" });

caseSchema.pre("validate", function () {
  if (Array.isArray(this.participants)) {
    for (let i = 0; i < this.participants.length; i++) {
      const p = this.participants[i];
      if (p && !p.user) {
        const id =
          typeof p === "string" || p instanceof mongoose.Types.ObjectId
            ? p
            : p._id;
        if (id) {
          this.participants[i] = { user: id, role: "Editor" };
        }
      }
    }
  }
});

caseSchema.methods.isParticipant = function (userId) {
  if (!userId) return false;
  const uid = userId._id ? userId._id.toString() : userId.toString();
  if (
    this.creatorId &&
    (this.creatorId._id
      ? this.creatorId._id.toString()
      : this.creatorId.toString()) === uid
  ) {
    return true;
  }
  return this.participants.some((p) => {
    if (!p) return false;
    const pId = p.user
      ? p.user._id
        ? p.user._id.toString()
        : p.user.toString()
      : p._id
        ? p._id.toString()
        : p.toString();
    return pId === uid;
  });
};

caseSchema.methods.getParticipantRole = function (userId) {
  if (!userId) return null;
  const uid = userId._id ? userId._id.toString() : userId.toString();
  if (
    this.creatorId &&
    (this.creatorId._id
      ? this.creatorId._id.toString()
      : this.creatorId.toString()) === uid
  ) {
    return "Admin";
  }
  const participant = this.participants.find((p) => {
    if (!p) return false;
    const pId = p.user
      ? p.user._id
        ? p.user._id.toString()
        : p.user.toString()
      : p._id
        ? p._id.toString()
        : p.toString();
    return pId === uid;
  });
  if (!participant) return null;
  return participant.role || "Editor";
};

const Case = mongoose.model("Case", caseSchema);

module.exports = Case;
