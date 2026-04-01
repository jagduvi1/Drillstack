const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerSkillHistorySchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    metric: { type: String, required: true, trim: true },
    oldValue: { type: Number, required: true, min: 0, max: 100 },
    newValue: { type: Number, required: true, min: 0, max: 100 },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

playerSkillHistorySchema.index({ player: 1, metric: 1, createdAt: -1 });

module.exports = mongoose.model("PlayerSkillHistory", playerSkillHistorySchema);
