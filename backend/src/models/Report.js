const mongoose = require("mongoose");
const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    // What is being reported
    targetType: {
      type: String,
      enum: ["drill", "contribution", "tactic"],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },

    reason: { type: String, required: true, maxlength: 1000 },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Admin resolution
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolution: { type: String, default: "" },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model("Report", reportSchema);
