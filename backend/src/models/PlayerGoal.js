const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerGoalSchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "" },
    metric: { type: String, default: "" },
    targetValue: { type: Number, default: null },
    startValue: { type: Number, default: null },
    currentValue: { type: Number, default: null },
    targetDate: { type: Date, default: null },
    status: { type: String, enum: ["active", "achieved", "abandoned"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

playerGoalSchema.index({ player: 1, status: 1 });

module.exports = mongoose.model("PlayerGoal", playerGoalSchema);
