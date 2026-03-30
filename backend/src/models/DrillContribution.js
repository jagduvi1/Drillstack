const mongoose = require("mongoose");
const { Schema } = mongoose;

const drillContributionSchema = new Schema(
  {
    drill: { type: Schema.Types.ObjectId, ref: "Drill", required: true, index: true },
    type: { type: String, enum: ["video", "drawing", "tactic"], required: true },

    // Video fields
    url: { type: String, default: "" },
    title: { type: String, default: "", trim: true, maxlength: 200 },

    // Drawing fields (uploaded file path)
    filePath: { type: String, default: "" },

    // Tactic board reference
    tactic: { type: Schema.Types.ObjectId, ref: "TacticBoard", default: null },

    // Visibility: who can see this contribution
    visibility: {
      type: String,
      enum: ["public", "private", "group"],
      default: "public",
    },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

drillContributionSchema.index({ drill: 1, createdBy: 1 });
drillContributionSchema.index({ drill: 1, visibility: 1 });

module.exports = mongoose.model("DrillContribution", drillContributionSchema);
