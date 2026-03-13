const mongoose = require("mongoose");
const { Schema } = mongoose;

const focusBlockSchema = new Schema(
  {
    name: { type: String, required: true },
    tags: [{ type: Schema.Types.ObjectId, ref: "Taxonomy" }],
    startWeek: { type: Number, required: true },
    endWeek: { type: Number, required: true },
    priority: { type: String, enum: ["primary", "secondary", "maintenance"], default: "primary" },
  },
  { _id: true }
);

const weeklyPlanSchema = new Schema(
  {
    week: { type: Number, required: true },
    sessions: [{ type: Schema.Types.ObjectId, ref: "TrainingSession" }],
    observationNotes: { type: String, default: "" },
  },
  { _id: true }
);

const periodPlanSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    sport: { type: String, default: null, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    focusBlocks: [focusBlockSchema],
    weeklyPlans: [weeklyPlanSchema],

    coverageTracking: { type: Schema.Types.Mixed, default: {} },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PeriodPlan", periodPlanSchema);
