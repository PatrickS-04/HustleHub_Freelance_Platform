// Structured logs: one JSON object per line on stdout, which Docker captures and
// a cloud log platform can collect. JSON escaping also keeps user input from
// forging extra log lines (log injection).
const SENSITIVE_KEY = /pass|token|secret|authorization|cookie/i;

// Safety net: anything under a sensitive key is masked, however deeply nested.
const redact = (key, value) => (SENSITIVE_KEY.test(key) ? "[REDACTED]" : value);

const format = (level, event, fields = {}) =>
  JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields }, redact);

const logger = {
  info: (event, fields) => console.log(format("info", event, fields)),
  warn: (event, fields) => console.log(format("warn", event, fields)),
  error: (event, fields) => console.log(format("error", event, fields)),
};

// Who and where, for tying an event back to its request. req.id is set by requestLogger.
const requestContext = (req) => ({ requestId: req.id, ip: req.ip, userId: req.user?.id });

module.exports = { logger, format, requestContext };
