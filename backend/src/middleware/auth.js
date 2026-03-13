const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret";

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
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

module.exports = { signToken, authenticate, authorizeAdmin };
