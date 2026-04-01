const mongoose = require("mongoose");
const { Schema } = mongoose;
const { createEncryptionHook, createDecryptionTransform } = require("../utils/encryption");

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

// Encrypt note content before save
playerNoteSchema.pre("save", createEncryptionHook(["content"]));

// Decrypt in API responses
playerNoteSchema.set("toJSON", { transform: createDecryptionTransform(["content"]) });
playerNoteSchema.set("toObject", { transform: createDecryptionTransform(["content"]) });

module.exports = mongoose.model("PlayerNote", playerNoteSchema);
