const isDev = process.env.NODE_ENV !== "production";

function errorHandler(err, _req, res, _next) {
  console.error(err.stack || err.message);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: "Validation failed", details: messages });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: "Duplicate entry" });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid request parameter" });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: statusCode >= 500 && !isDev ? "Internal server error" : (err.message || "Internal server error"),
  });
}

module.exports = errorHandler;
