const mongoose = require("mongoose");

const citationSchema = new mongoose.Schema({
  sourceType: String,
  sourceId: String,
  caseId: String,
  label: String,
  pageNumber: Number,
  segment: String,
  relevance: Number,
}, { _id: false });

const turnSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  citations: [citationSchema],
  confidence: Number,
}, { timestamps: true });

const aiConversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  scope: { type: String, enum: ["case", "knowledge", "document"], required: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", default: null, index: true },
  title: { type: String, trim: true, maxlength: 120 },
  turns: [turnSchema],
}, { timestamps: true });

aiConversationSchema.index({ userId: 1, scope: 1, caseId: 1, updatedAt: -1 });
module.exports = mongoose.model("AIConversation", aiConversationSchema);
