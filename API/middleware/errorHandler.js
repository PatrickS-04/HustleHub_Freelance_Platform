const { logger, requestContext } = require("../utils/logger");

function notFound(req, res) {
  res.status(404).json({ error: "Resource not found." });
}

const logLevelFor = (status) => (status >= 500 ? "error" : status >= 400 ? "warn" : "info");

function errorResponse(err) {
  if (err.type === "entity.parse.failed") {
    return { status: 400, error: "Malformed JSON in request body." };
  }

  if (err.type === "entity.too.large") {
    return { status: 413, error: "Request body is too large." };
  }

  if (err.name === "CastError") {
    return { status: 400, error: "Invalid identifier" };
  }

  if (err.name === "ValidationError") {
    return { status: 400, error: "Invalid request data" };
  }

  if (err.code === 11000) {
    return { status: 409, error: "That value is already in use" };
  }

  return { status: err.status || 500, error: "An unexpected error occurred." };
}

function errorHandler(err, req, res, next) {
  const { status, error } = errorResponse(err);
  // Server-side only. Client errors skip the message and stack: they can echo
  // what the user submitted, and they aren't faults in the system.
  logger[logLevelFor(status)]("http.error", {
    ...requestContext(req),
    status,
    errorName: err.name,
    ...(status >= 500 && { message: err.message, stack: err.stack }),
  });
  res.status(status).json({ error });
}

module.exports = { notFound, errorHandler, logLevelFor, errorResponse };
