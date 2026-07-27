const mongoose = require("mongoose");

const annotationSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    pageNumber: {
      type: Number,
      default: 1,
    },
    type: {
      type: String,
      enum: ["pen", "highlighter", "text", "rectangle", "arrow"],
      required: true,
    },
    coordinates: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      points: [
        {
          x: { type: Number, required: true },
          y: { type: Number, required: true },
        },
      ],
    },
    style: {
      color: { type: String, default: "#ef4444" },
      strokeWidth: { type: Number, default: 3 },
      opacity: { type: Number, default: 1 },
      fontSize: { type: Number, default: 14 },
    },
    text: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

annotationSchema.index({ caseId: 1, fileUrl: 1 });
annotationSchema.index({ messageId: 1 });

const Annotation = mongoose.model("Annotation", annotationSchema);

module.exports = Annotation;
