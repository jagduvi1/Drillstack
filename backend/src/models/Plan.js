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

const phaseSchema = new Schema(
  {
    name: { type: String, required: true },
    primaryFocus: { type: String, required: true },
    secondaryFocus: { type: String, default: "" },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const planSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sport: { type: String, default: null, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    objective: { type: String, default: "" },

    phases: [phaseSchema],

    // AI conversation for refinement
    aiConversation: [aiMessageSchema],

    // Groups that follow this plan
    followers: [{ type: Schema.Types.ObjectId, ref: "Group" }],

    // Sharing
    visibility: { type: String, enum: ["private", "group"], default: "private" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
