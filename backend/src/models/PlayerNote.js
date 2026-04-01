const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerNoteSchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    content: { type: String, required: true, maxlength: 2000 },
    category: { type: String, enum: ["general", "training", "match", "injury", "behavior"], default: "general" },
    session: { type: Schema.Types.ObjectId, ref: "TrainingSession", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

playerNoteSchema.index({ player: 1, createdAt: -1 });

module.exports = mongoose.model("PlayerNote", playerNoteSchema);
