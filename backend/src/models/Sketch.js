const mongoose = require("mongoose");
const { Schema } = mongoose;

const sketchStepSchema = new Schema(
  {
    label: { type: String, default: "" },
    duration: { type: Number, default: 1500 }, // ms
    pieces: [{ type: Schema.Types.Mixed }],
    arrows: [{ type: Schema.Types.Mixed }],
  },
  { _id: true }
);

const sketchSchema = new Schema(
  {
    title: { type: String, default: "", trim: true },
    sport: { type: String, default: "" },
    // Legacy single-step fields (kept for backward compat)
    pieces: [{ type: Schema.Types.Mixed }],
    arrows: [{ type: Schema.Types.Mixed }],
    // Multi-step animation
    steps: [sketchStepSchema],
    drill: { type: Schema.Types.ObjectId, ref: "Drill", default: null },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null, index: true },
    visibility: { type: String, enum: ["private", "group"], default: "private" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sketch", sketchSchema);
