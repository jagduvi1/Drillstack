const mongoose = require("mongoose");

const taxonomySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
      // Dynamic categories: individual_skills, coordination, perception,
      // roles, didactic_strategy, game_form, intensity, equipment,
      // success_criteria, space, or any new category added later.
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    sport: {
      type: String,
      default: null,
      index: true,
      // null = universal (applies to all sports)
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Taxonomy",
      default: null,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

taxonomySchema.index({ category: 1, sport: 1 });
taxonomySchema.index({ category: 1, name: 1, sport: 1 }, { unique: true });

module.exports = mongoose.model("Taxonomy", taxonomySchema);
