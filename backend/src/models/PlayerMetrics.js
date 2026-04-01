const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerMetricsSchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: "Player", required: true, unique: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    ratings: {
      type: Map,
      of: Number, // each value 0-100
      default: () => new Map(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlayerMetrics", playerMetricsSchema);
