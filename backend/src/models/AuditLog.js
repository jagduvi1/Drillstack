const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, default: "" },
    ip: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

async function logAudit(action, { userId, email, ip, details } = {}) {
  try {
    await mongoose.model("AuditLog").create({ action, userId, email, ip, details });
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
}

module.exports = mongoose.model("AuditLog", auditLogSchema);
module.exports.logAudit = logAudit;
