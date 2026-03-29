const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("JWT_SECRET must be set in production"); })() : "dev-jwt-secret");
const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";
const REFRESH_SECRET = process.env.REFRESH_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("REFRESH_SECRET must be set in production"); })() : "dev-refresh-secret");
const REFRESH_EXPIRY = process.env.REFRESH_EXPIRY || "7d";

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function signRefreshToken(userId) {
  return jwt.sign({ id: userId, type: "refresh" }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

/** Hash a refresh token for safe DB storage */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password -refreshTokens");
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function authorizeAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = { signToken, signRefreshToken, hashToken, authenticate, authorizeAdmin, REFRESH_SECRET };
