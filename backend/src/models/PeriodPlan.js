const mongoose = require("mongoose");
const { Schema } = mongoose;

const aiMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const sessionOutlineSchema = new Schema(
  {
    dayOfWeek: { type: String, default: "" },
    title: { type: String, default: "" },
    focus: { type: String, default: "" },
    intensity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    durationMinutes: { type: Number, default: 60 },
    notes: { type: String, default: "" },
    linkedSession: { type: Schema.Types.ObjectId, ref: "TrainingSession", default: null },
  },
  { _id: true }
);

const weeklyPlanSchema = new Schema(
  {
    week: { type: Number, required: true },
    theme: { type: String, default: "" },
    sessions: [sessionOutlineSchema],
    notes: { type: String, default: "" },
  },
  { _id: true }
);

const periodPlanSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    sport: { type: String, default: null, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Program parameters
    sessionsPerWeek: { type: Number, default: 3 },
    goals: [{ type: String }],
    focusAreas: [{ type: String }],

    weeklyPlans: [weeklyPlanSchema],

    // AI conversation for refinement
    aiConversation: [aiMessageSchema],

    // ── Group sharing ─────────────────────────────────────────────────
    visibility: { type: String, enum: ["private", "group"], default: "private" },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PeriodPlan", periodPlanSchema);
