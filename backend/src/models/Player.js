const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    position: { type: String, default: "", trim: true },
    number: { type: Number, default: null },
    strengths: [{ type: String, trim: true }],
    weaknesses: [{ type: String, trim: true }],
    notes: { type: String, default: "" },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

playerSchema.index({ group: 1, active: 1 });

module.exports = mongoose.model("Player", playerSchema);
