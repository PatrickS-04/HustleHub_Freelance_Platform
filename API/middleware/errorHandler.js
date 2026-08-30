function notFound(req, res) {
  res.status(404).json({ error: "Resource not found." });
}

function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}]`, err.stack || err); // server-side only
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON in request body." });
  }
  res.status(err.status || 500).json({ error: "An unexpected error occurred." });
}

module.exports = { notFound, errorHandler };
