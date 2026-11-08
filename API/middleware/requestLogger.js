const { randomUUID } = require("node:crypto");
const { logger, requestContext } = require("../utils/logger");
const { logLevelFor } = require("./errorHandler");

// One line per finished request, so 401s, 403s and 429s can be monitored without
// a log call in every route. The query string is left out: it can hold user data.
function requestLogger(req, res, next) {
  req.id = randomUUID();
  const startedAt = Date.now();

  res.on("finish", () => {
    if (req.path === "/health") return; // polled constantly, only noise
    logger[logLevelFor(res.statusCode)]("http.request", {
      ...requestContext(req),
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
}

module.exports = requestLogger;
