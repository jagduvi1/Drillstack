const mongoose = require("mongoose");
const { Schema } = mongoose;

const sketchSchema = new Schema(
  {
    title: { type: String, default: "", trim: true },
    sport: { type: String, default: "" },
    pieces: [{ type: Schema.Types.Mixed }],
    arrows: [{ type: Schema.Types.Mixed }],
    drill: { type: Schema.Types.ObjectId, ref: "Drill", default: null },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null, index: true },
    visibility: { type: String, enum: ["private", "group"], default: "private" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sketch", sketchSchema);
