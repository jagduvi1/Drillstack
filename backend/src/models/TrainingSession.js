const mongoose = require("mongoose");
const { Schema } = mongoose;

const SECTION_TYPES = ["warmup", "main", "cooldown"];

const sectionDrillSchema = new Schema(
  {
    drill: { type: Schema.Types.ObjectId, ref: "Drill", required: true },
    duration: { type: Number, required: true },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const sectionSchema = new Schema(
  {
    type: { type: String, enum: SECTION_TYPES, required: true },
    drills: [sectionDrillSchema],
    notes: { type: String, default: "" },
  },
  { _id: true }
);

const sessionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    date: { type: Date },
    sport: { type: String, default: null, index: true },

    sections: [sectionSchema],

    totalDuration: { type: Number, default: 0 },
    equipmentSummary: [{ type: String }],

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Compute totalDuration before save
sessionSchema.pre("save", function (next) {
  this.totalDuration = this.sections.reduce((sum, section) => {
    return sum + section.drills.reduce((s, d) => s + (d.duration || 0), 0);
  }, 0);
  next();
});

module.exports = mongoose.model("TrainingSession", sessionSchema);
