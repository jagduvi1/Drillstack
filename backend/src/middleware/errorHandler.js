function errorHandler(err, _req, res, _next) {
  console.error(err.stack || err.message);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: "Validation failed", details: messages });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: "Duplicate entry", details: err.keyValue });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ error: `Invalid ${err.path}: ${err.value}` });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
}

module.exports = errorHandler;
