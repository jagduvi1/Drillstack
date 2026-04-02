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
      duration: { type: String, default: "" },
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

    // ── Focus-area tags (used for plan match scoring) ──────────────────────
    tags: [{ type: String }],

    // ── Sport-specific fields ──────────────────────────────────────────────
    apparatus: { type: String, default: "" }, // e.g. floor, beam, bars, vault, trampoline, general
    skillLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "competitive", ""],
      default: "",
    },
    prerequisites: [{ type: String }],
    safetyNotes: { type: String, default: "" },
    progressionParent: { type: Schema.Types.ObjectId, ref: "Drill", default: null },

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

    // ── 3D Sketch ────────────────────────────────────────────────────────────
    sketch: {
      pieces: [{ type: Schema.Types.Mixed }],   // { id, type, team, label, x, z, color }
      arrows: [{ type: Schema.Types.Mixed }],   // { id, fromX, fromZ, toX, toZ, color, style }
      fieldType: { type: String, default: "full" },
      sport: { type: String, default: "" },
    },

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

drillSchema.index({ title: "text", description: "text", howItWorks: "text", tags: "text" });
drillSchema.index({ parentDrill: 1 });

module.exports = mongoose.model("Drill", drillSchema);
