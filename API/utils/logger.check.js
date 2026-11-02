// Run: node utils/logger.check.js
const assert = require("node:assert");
const { format, requestContext } = require("./logger");
const { logLevelFor, errorResponse } = require("../middleware/errorHandler");

// one parseable line with the standard fields
const entry = JSON.parse(format("info", "booking.created", { bookingId: "b1" }));
assert.strictEqual(entry.level, "info");
assert.strictEqual(entry.event, "booking.created");
assert.strictEqual(entry.bookingId, "b1");
assert.ok(!Number.isNaN(Date.parse(entry.timestamp)));

// secrets are masked, including nested and differently cased keys
const secret = "hunter2";
const line = format("warn", "x", {
  password: secret,
  passwordHash: secret,
  nested: { newPassword: secret, Authorization: secret, cookie: secret },
  token: secret,
  jwtSecret: secret,
});
assert.ok(!line.includes(secret), line);
assert.strictEqual(JSON.parse(line).password, "[REDACTED]");

// user input cannot forge a second log line
const forged = format("warn", "x", { path: '/a\n{"level":"info","event":"auth.login.success"}' });
assert.strictEqual(forged.split("\n").length, 1);

// request context
assert.deepStrictEqual(requestContext({ id: "r1", ip: "1.2.3.4", user: { id: "u1" } }), {
  requestId: "r1",
  ip: "1.2.3.4",
  userId: "u1",
});
assert.strictEqual(requestContext({ id: "r1", ip: "1.2.3.4" }).userId, undefined);

// level follows the response status
assert.strictEqual(logLevelFor(200), "info");
assert.strictEqual(logLevelFor(403), "warn");
assert.strictEqual(logLevelFor(500), "error");

// the status logged for an error matches the status sent, and clients get no internals
assert.strictEqual(errorResponse({ name: "CastError" }).status, 400);
assert.strictEqual(errorResponse({ code: 11000 }).status, 409);
const unexpected = errorResponse(new Error("connect ECONNREFUSED mongo:27017"));
assert.strictEqual(unexpected.status, 500);
assert.strictEqual(unexpected.error, "An unexpected error occurred.");

console.log("logger checks passed");
