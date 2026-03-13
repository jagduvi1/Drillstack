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

    // ── AI conversation history ─────────────────────────────────────────────
    aiConversation: [aiMessageSchema],

    // ── Embedding status ───────────────────────────────────────────────────
    embeddingStatus: {
      type: String,
      enum: ["pending", "processing", "indexed", "failed"],
      default: "pending",
    },
    embeddingError: { type: String, default: null },

    // ── Media & reflections ─────────────────────────────────────────────────
    diagrams: [{ type: String }],
    reflectionNotes: [reflectionSchema],

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

drillSchema.index({ title: "text", description: "text", howItWorks: "text" });

module.exports = mongoose.model("Drill", drillSchema);
