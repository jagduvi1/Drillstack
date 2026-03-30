const mongoose = require("mongoose");
const crypto = require("crypto");
const { Schema } = mongoose;

const memberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "admin", "trainer", "viewer"], default: "viewer" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    sport: { type: String, default: "" },

    // "club" = umbrella org that teams can join; "team" = standalone or under a club
    type: { type: String, enum: ["club", "team"], default: "team" },

    // For teams: which club they belong to (null = standalone team)
    parentClub: { type: Schema.Types.ObjectId, ref: "Group", default: null, index: true },

    members: [memberSchema],

    inviteCode: { type: String, unique: true, sparse: true },

    starredDrills: [{ type: Schema.Types.ObjectId, ref: "Drill" }],

    // Club verification — clubs require admin approval before full activation
    verified: { type: Boolean, default: null }, // null = not applicable (teams), false = pending, true = verified

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

groupSchema.index({ "members.user": 1 });

groupSchema.pre("save", function (next) {
  if (!this.inviteCode) {
    this.inviteCode = crypto.randomBytes(16).toString("hex");
  }
  // Clubs default to unverified, teams don't need verification
  if (this.isNew && this.type === "club" && this.verified === null) {
    this.verified = false;
  }
  next();
});

module.exports = mongoose.model("Group", groupSchema);
