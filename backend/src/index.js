require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const connectDB = require("./config/db");
const { ensureCollection } = require("./config/qdrant");
const { ensureIndexes, isEnabled: meiliEnabled } = require("./config/meilisearch");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow uploads to load cross-origin
}));

// ── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : (process.env.NODE_ENV === "production" ? false : true),
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
}, express.static(path.join(__dirname, "..", "uploads")));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/drills", require("./routes/drills"));
app.use("/api/sessions", require("./routes/sessions"));
app.use("/api/plans", require("./routes/plans"));
app.use("/api/search", require("./routes/search"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/superadmin", require("./routes/superadmin"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/tactics", require("./routes/tactics"));
app.use("/api/billing", require("./routes/billing"));
app.use("/api/groups", require("./routes/groups"));

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ── Error handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();

  // Initialize search engines (non-blocking — log errors but don't crash)
  ensureCollection().catch((e) =>
    console.warn("Qdrant init skipped:", e.message)
  );
  if (meiliEnabled()) {
    ensureIndexes().catch((e) =>
      console.warn("Meilisearch init skipped:", e.message)
    );
  }

  app.listen(PORT, () => console.log(`API listening on :${PORT}`));
}

// Allow importing app for tests without starting the server
if (require.main === module) {
  start();
}

module.exports = app;
