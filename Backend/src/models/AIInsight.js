const mongoose = require("mongoose");

const sourceSchema = new mongoose.Schema({ sourceType: String, sourceId: String, pageNumber: Number, segment: String }, { _id: false });
const aiInsightSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true, index: true },
  type: { type: String, enum: ["contradiction"], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  confidence: Number,
  sources: [sourceSchema],
  status: { type: String, enum: ["new", "reviewed", "dismissed", "invalidated"], default: "new" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
}, { timestamps: true });
aiInsightSchema.index({ caseId: 1, type: 1, status: 1 });
module.exports = mongoose.model("AIInsight", aiInsightSchema);
