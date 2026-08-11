const mongoose = require("mongoose");

const aiIndexJobSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    sourceType: { type: String, enum: ["message", "document", "meeting"], required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    action: { type: String, enum: ["upsert", "delete", "scan_contradictions"], default: "upsert" },
    status: { type: String, enum: ["queued", "processing", "complete", "failed", "unsupported"], default: "queued", index: true },
    attempts: { type: Number, default: 0 },
    error: String,
    lockedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

aiIndexJobSchema.index({ status: 1, createdAt: 1 });
aiIndexJobSchema.index({ caseId: 1, sourceType: 1, sourceId: 1, status: 1 });
module.exports = mongoose.model("AIIndexJob", aiIndexJobSchema);
