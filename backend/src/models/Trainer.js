const mongoose = require("mongoose");
const { Schema } = mongoose;
const { createEncryptionHook, createDecryptionTransform } = require("../utils/encryption");

const PII_FIELDS = ["phone", "email", "notes"];

const trainerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    role: { type: String, default: "", trim: true }, // e.g. "head coach", "assistant", "goalkeeper coach"
    specialization: { type: String, default: "", trim: true },
    certifications: [{ type: String, trim: true }],
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    notes: { type: String, default: "" },
    // Link to app user (optional — trainer may not have an account)
    linkedUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

trainerSchema.index({ group: 1, active: 1 });

// Encrypt PII fields before save
trainerSchema.pre("save", createEncryptionHook(PII_FIELDS));

// Decrypt PII fields in API responses
trainerSchema.set("toJSON", { transform: createDecryptionTransform(PII_FIELDS) });
trainerSchema.set("toObject", { transform: createDecryptionTransform(PII_FIELDS) });

module.exports = mongoose.model("Trainer", trainerSchema);
