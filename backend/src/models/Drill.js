const mongoose = require("mongoose");
const { Schema } = mongoose;

const reflectionSchema = new Schema(
  {
    date: { type: Date, default: Date.now },
    note: { type: String, required: true },
  },
  { _id: true }
);

const aiMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const drillSchema = new Schema(
  {
    // ── Core: the description drives everything ─────────────────────────────
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    sport: { type: String, default: null, index: true },

    // ── AI-generated structured content (editable by coach) ─────────────────
    setup: {
      players: { type: String, default: "" },
      space: { type: String, default: "" },
      equipment: [{ type: String }],
    },

    howItWorks: { type: String, default: "" },
    coachingPoints: [{ type: String }],
    variations: [{ type: String }],
    commonMistakes: [{ type: String }],

    intensity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // ── AI conversation history ─────────────────────────────────────────────
    aiConversation: [aiMessageSchema],

    // ── Embedding status ───────────────────────────────────────────────────
    embeddingStatus: {
      type: String,
      enum: ["pending", "processing", "indexed", "failed"],
      default: "pending",
    },
    embeddingError: { type: String, default: null },

    // ── Versioning ─────────────────────────────────────────────────────────
    parentDrill: { type: Schema.Types.ObjectId, ref: "Drill", default: null },
    version: { type: Number, default: 1 },
    versionName: { type: String, default: "", trim: true },
    forkedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    // ── Media & reflections ─────────────────────────────────────────────────
    diagrams: [{ type: String }],
    reflectionNotes: [reflectionSchema],

    // ── Deletion protection ──────────────────────────────────────────────────
    pendingDeletion: { type: Boolean, default: false, index: true },
    deletionRequestedAt: { type: Date, default: null },
    deletionRequestedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

drillSchema.index({ title: "text", description: "text", howItWorks: "text" });
drillSchema.index({ parentDrill: 1 });

module.exports = mongoose.model("Drill", drillSchema);
