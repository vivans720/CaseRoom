const mongoose = require("mongoose");

const aiClaimSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true, index: true },
  sourceType: { type: String, required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sourceVersion: String,
  text: { type: String, required: true },
  topic: String,
  pageNumber: Number,
  segment: String,
}, { timestamps: true });
aiClaimSchema.index({ caseId: 1, sourceId: 1, sourceVersion: 1 });
module.exports = mongoose.model("AIClaim", aiClaimSchema);
