function notFound(req, res) {
  res.status(404).json({ error: "Resource not found." });
}

function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}]`, err.stack || err); // server-side only
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON in request body." });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }

  if (err.type === "CastError") {
    return res.status(400).json({ error: "Invalid identifier" });
  }

  if (err.type === "ValidationError") {
    return res.status(400).json({ error: "Invalid request data" });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: "That value is already in use" });
  }
  
  res.status(err.status || 500).json({ error: "An unexpected error occurred." });
}

module.exports = { notFound, errorHandler };
