const mongoose = require("mongoose");
const { Schema } = mongoose;

// ── Sub-schemas for block internals ──────────────────────────────────────────

const blockDrillSchema = new Schema(
  {
    drill: { type: Schema.Types.ObjectId, ref: "Drill", required: true },
    duration: { type: Number, required: true },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const stationSchema = new Schema(
  {
    stationNumber: { type: Number, required: true },
    drill: { type: Schema.Types.ObjectId, ref: "Drill" },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

// ── Block schema (union of all block types) ──────────────────────────────────

const BLOCK_TYPES = ["drills", "stations", "matchplay", "break", "custom"];

const blockSchema = new Schema(
  {
    type: { type: String, enum: BLOCK_TYPES, required: true },
    label: { type: String, default: "" },
    order: { type: Number, default: 0 },
    notes: { type: String, default: "" },

    // -- type: "drills" --
    drills: [blockDrillSchema],

    // -- type: "stations" --
    stationCount: { type: Number, default: 0 },
    rotationMinutes: { type: Number, default: 0 },
    stations: [stationSchema],

    // -- type: "matchplay" --
    matchDescription: { type: String, default: "" },
    rules: { type: String, default: "" },

    // -- type: "break" | "matchplay" | "custom" --
    duration: { type: Number, default: 0 },

    // -- type: "custom" --
    customContent: { type: String, default: "" },
  },
  { _id: true }
);

// ── Session schema ───────────────────────────────────────────────────────────

const sessionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    date: { type: Date },
    sport: { type: String, default: null, index: true },

    blocks: [blockSchema],

    // ── Attendance ────────────────────────────────────────────────────────
    expectedPlayers: { type: Number, default: 0 },
    expectedTrainers: { type: Number, default: 0 },
    actualPlayers: { type: Number, default: null },
    actualTrainers: { type: Number, default: null },
    attendees: [{ type: Schema.Types.ObjectId, ref: "Player" }],

    totalDuration: { type: Number, default: 0 },
    equipmentSummary: [{ type: String }],
    aiGenerated: { type: Boolean, default: false },
    aiConversation: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
      },
    ],

    // ── Group sharing ─────────────────────────────────────────────────
    visibility: { type: String, enum: ["private", "group", "club"], default: "private" },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// Compute totalDuration before save
sessionSchema.pre("save", function (next) {
  this.totalDuration = this.blocks.reduce((sum, block) => {
    switch (block.type) {
      case "drills":
        return sum + block.drills.reduce((s, d) => s + (d.duration || 0), 0);
      case "stations":
        return sum + (block.stationCount || 0) * (block.rotationMinutes || 0);
      case "matchplay":
      case "break":
      case "custom":
        return sum + (block.duration || 0);
      default:
        return sum;
    }
  }, 0);
  next();
});

module.exports = mongoose.model("TrainingSession", sessionSchema);
