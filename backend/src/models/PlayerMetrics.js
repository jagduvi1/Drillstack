const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerMetricsSchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: "Player", required: true, unique: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    ratings: {
      type: Map,
      of: mongoose.Schema.Types.Mixed, // Number (0-100), String (level), or Boolean (certification)
      default: () => new Map(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlayerMetrics", playerMetricsSchema);
