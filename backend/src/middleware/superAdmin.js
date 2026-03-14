const User = require("../models/User");
const { logAudit } = require("../models/AuditLog");

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const SUPER_ADMIN_IPS = process.env.SUPER_ADMIN_IPS
  ? process.env.SUPER_ADMIN_IPS.split(",").map((ip) => ip.trim()).filter(Boolean)
  : [];

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

/**
 * Middleware that blocks requests unless the caller is the super admin.
 * Three-layer check: env email configured → IP allowlist → DB email match.
 */
async function requireSuperAdmin(req, res, next) {
  const ip = getClientIp(req);

  // 1. SUPER_ADMIN_EMAIL must be configured
  if (!SUPER_ADMIN_EMAIL) {
    return res.status(403).json({ error: "Super admin not configured" });
  }

  // 2. IP allowlist (if configured)
  if (SUPER_ADMIN_IPS.length > 0 && !SUPER_ADMIN_IPS.includes(ip)) {
    logAudit("superadmin.ip_denied", {
      userId: req.user?._id,
      email: req.user?.email,
      ip,
    });
    return res.status(403).json({ error: "Access denied" });
  }

  // 3. User must be authenticated and email must match
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = await User.findById(req.user._id);
  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    logAudit("superadmin.email_denied", {
      userId: req.user._id,
      email: req.user.email,
      ip,
    });
    return res.status(403).json({ error: "Access denied" });
  }

  logAudit("superadmin.access", {
    userId: req.user._id,
    email: req.user.email,
    ip,
    details: { path: req.path },
  });

  next();
}

/**
 * Helper for /api/auth/me — stamps user with isSuperAdmin flag.
 */
function checkIsSuperAdmin(user) {
  if (!SUPER_ADMIN_EMAIL) return false;
  return user.email === SUPER_ADMIN_EMAIL;
}

module.exports = { requireSuperAdmin, checkIsSuperAdmin };
