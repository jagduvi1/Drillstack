const mongoose = require("mongoose");
const { Schema } = mongoose;

const tagRefSchema = new Schema(
  {
    category: { type: String, required: true },
    taxonomy: { type: Schema.Types.ObjectId, ref: "Taxonomy", required: true },
  },
  { _id: false }
);

const variationSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    tags: [tagRefSchema],
  },
  { _id: true }
);

const mistakeSchema = new Schema(
  {
    mistake: { type: String, required: true },
    correction: { type: String, required: true },
  },
  { _id: false }
);

const zoneSchema = new Schema(
  {
    name: { type: String },
    rules: { type: String },
  },
  { _id: false }
);

const reflectionSchema = new Schema(
  {
    date: { type: Date, default: Date.now },
    note: { type: String, required: true },
  },
  { _id: true }
);

const drillSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    purpose: { type: String, required: true },
    sport: { type: String, default: null, index: true },

    tags: [tagRefSchema],

    // Exactly one active instruction focus at a time
    instructionFocus: {
      active: {
        taxonomy: { type: Schema.Types.ObjectId, ref: "Taxonomy", default: null },
        description: { type: String, default: "" },
      },
      history: [
        {
          taxonomy: { type: Schema.Types.ObjectId, ref: "Taxonomy" },
          description: String,
          activatedAt: Date,
          deactivatedAt: Date,
        },
      ],
    },

    guidedQuestions: [{ type: String }],
    rules: [{ type: String }],

    successCriteria: [
      {
        type: { type: String },
        description: { type: String },
      },
    ],

    variations: [variationSchema],

    commonMistakes: [mistakeSchema],

    space: {
      dimensions: { type: String, default: "" },
      shape: { type: String, default: "" },
      zones: [zoneSchema],
    },

    gameForm: {
      format: { type: String, default: "" }, // e.g. "4v4", "3v3+1"
      goalkeepers: { type: Boolean, default: false },
    },

    equipment: [
      {
        taxonomy: { type: Schema.Types.ObjectId, ref: "Taxonomy" },
        quantity: { type: Number, default: 1 },
      },
    ],

    duration: { type: Number, default: 0 }, // minutes
    intensity: { type: String, default: "medium" },

    diagrams: [{ type: String }], // file paths / URLs

    reflectionNotes: [reflectionSchema],

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

drillSchema.index({ title: "text", purpose: "text" });

module.exports = mongoose.model("Drill", drillSchema);
