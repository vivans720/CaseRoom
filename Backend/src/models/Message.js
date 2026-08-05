const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "document", "meeting_started"],
      default: "text",
    },
    content: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (this.type === "text" && !this.isDeleted) {
            return value && value.trim().length > 0;
          }
          return true;
        },
        message: "Content is required for text messages",
      },
    },
    fileUrl: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    fileMimeType: { type: String },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    editedAt: { type: Date },
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reactions: [
      {
        emoji: { type: String, required: true },
        userIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
    isPinned: { type: Boolean, default: false },
    pinnedAt: { type: Date },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ caseId: 1, createdAt: -1 });
messageSchema.index({ content: "text", fileName: "text" });
messageSchema.index({ caseId: 1, "readBy.userId": 1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
