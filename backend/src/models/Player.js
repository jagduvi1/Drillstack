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

    // Physical attributes
    dateOfBirth: { type: Date, default: null },
    height: { type: Number, default: null },          // cm
    weight: { type: Number, default: null },          // kg
    preferredFoot: { type: String, enum: ["left", "right", "both", ""], default: "" },
    preferredHand: { type: String, enum: ["left", "right", "both", ""], default: "" },
    photoUrl: { type: String, default: "" },

    // Overall skill rating (0-100)
    skillRating: { type: Number, default: null, min: 0, max: 100 },

    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

playerSchema.index({ group: 1, active: 1 });

module.exports = mongoose.model("Player", playerSchema);
