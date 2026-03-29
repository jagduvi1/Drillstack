const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["coach", "admin"], default: "coach" },
    sports: [{ type: String, trim: true }],
    starredDrills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Drill" }],
    // Map of parentDrillId → preferred versionId
    defaultVersions: {
      type: Map,
      of: mongoose.Schema.Types.ObjectId,
      default: () => new Map(),
    },

    // ── Billing / plan fields ───────────────────────────────────────────
    plan: { type: String, enum: ["starter", "coach", "pro"], default: "starter" },
    trialPlan: { type: String, default: null },
    trialEndsAt: { type: Date, default: null },
    trialUsed: { type: Boolean, default: false },
    aiRequestsUsed: { type: Number, default: 0 },
    aiRequestsResetAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
