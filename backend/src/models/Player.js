const mongoose = require("mongoose");
const { Schema } = mongoose;
const { createEncryptionHook, createDecryptionTransform } = require("../utils/encryption");

const PII_STRING_FIELDS = ["notes", "photoUrl"];
const PII_NUMBER_FIELDS = ["height", "weight"];

const playerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    position: { type: String, default: "", trim: true },
    defencePosition: { type: String, default: "", trim: true },
    number: { type: Number, default: null },
    strengths: [{ type: String, trim: true }],
    weaknesses: [{ type: String, trim: true }],
    notes: { type: String, default: "" },

    // Physical attributes (height/weight encrypted at rest)
    dateOfBirth: { type: Date, default: null },
    height: { type: Schema.Types.Mixed, default: null },  // cm — encrypted
    weight: { type: Schema.Types.Mixed, default: null },  // kg — encrypted
    preferredFoot: { type: String, enum: ["left", "right", "ambidextrous", ""], default: "" },
    preferredHand: { type: String, enum: ["left", "right", "ambidextrous", ""], default: "" },
    photoUrl: { type: String, default: "" },

    // Overall skill rating (0-100)
    skillRating: { type: Number, default: null, min: 0, max: 100 },

    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

playerSchema.index({ group: 1, active: 1 });

// Encrypt PII fields before save
playerSchema.pre("save", createEncryptionHook(PII_STRING_FIELDS, PII_NUMBER_FIELDS));

// Decrypt PII fields when converting to JSON (API responses)
playerSchema.set("toJSON", { transform: createDecryptionTransform(PII_STRING_FIELDS, PII_NUMBER_FIELDS) });
playerSchema.set("toObject", { transform: createDecryptionTransform(PII_STRING_FIELDS, PII_NUMBER_FIELDS) });

module.exports = mongoose.model("Player", playerSchema);
