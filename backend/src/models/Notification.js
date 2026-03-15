const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["drill_changed"],
      required: true,
    },
    drillId: { type: Schema.Types.ObjectId, ref: "Drill", required: true },
    message: { type: String, required: true },
    // Snapshot of the drill BEFORE the owner changed it
    snapshot: {
      title: String,
      description: String,
      sport: String,
      intensity: String,
      setup: {
        players: String,
        space: String,
        equipment: [String],
        duration: String,
      },
      howItWorks: String,
      coachingPoints: [String],
      variations: [String],
      commonMistakes: [String],
      diagrams: [String],
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index: unread notifications per user, newest first
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
