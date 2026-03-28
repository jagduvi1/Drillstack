const mongoose = require("mongoose");
const { Schema } = mongoose;

const pieceSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["player", "ball", "cone"], default: "player" },
    team: { type: String, enum: ["home", "away", "neutral"], default: "home" },
    label: { type: String, default: "" },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    isGK: { type: Boolean, default: false },
  },
  { _id: false }
);

const arrowSchema = new Schema(
  {
    id: { type: String, required: true },
    fromX: { type: Number, required: true },
    fromY: { type: Number, required: true },
    toX: { type: Number, required: true },
    toY: { type: Number, required: true },
    color: { type: String, default: "#ffffff" },
    style: { type: String, enum: ["solid", "dashed"], default: "solid" },
  },
  { _id: false }
);

const stepSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: "" },
    duration: { type: Number, default: 1500 },
    pieces: [pieceSchema],
    arrows: [arrowSchema],
  },
  { _id: false }
);

const tacticBoardSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    sport: { type: String, default: "football", index: true },

    fieldType: {
      type: String,
      enum: ["full", "half", "third", "blank"],
      default: "full",
    },

    homeTeam: {
      name: { type: String, default: "Home" },
      color: { type: String, default: "#2563eb" },
      formation: { type: String, default: "4-4-2" },
    },
    awayTeam: {
      name: { type: String, default: "Away" },
      color: { type: String, default: "#ef4444" },
      formation: { type: String, default: "4-4-2" },
    },

    steps: [stepSchema],

    // Link to a drill (optional)
    drill: { type: Schema.Types.ObjectId, ref: "Drill", default: null },

    isPublic: { type: Boolean, default: false },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null },
    tags: [{ type: String }],

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

tacticBoardSchema.index({ createdBy: 1, updatedAt: -1 });
tacticBoardSchema.index({ drill: 1 });

module.exports = mongoose.model("TacticBoard", tacticBoardSchema);
