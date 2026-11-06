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

// Loki payload: one stream per level, nanosecond string timestamps, lines untouched
const { lokiPayload } = require("./logger");
const payload = lokiPayload([
  { level: "info", ms: 1700000000000, line: "a" },
  { level: "warn", ms: 1700000000001, line: "b" },
  { level: "info", ms: 1700000000002, line: "c" },
]);
assert.deepStrictEqual(payload, {
  streams: [
    { stream: { service: "hustlehub-api", level: "info" }, values: [["1700000000000000000", "a"], ["1700000000002000000", "c"]] },
    { stream: { service: "hustlehub-api", level: "warn" }, values: [["1700000000001000000", "b"]] },
  ],
});

// End to end against a fake Loki: basic auth is sent, the body is a valid push,
// and secrets are already masked before anything leaves the server.
(async () => {
  const http = require("node:http");
  let received;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      received = { auth: req.headers.authorization, body: JSON.parse(body) };
      res.writeHead(204).end();
    });
  });
  await new Promise((r) => server.listen(0, r));
  Object.assign(process.env, {
    LOKI_URL: `http://127.0.0.1:${server.address().port}/loki/api/v1/push`,
    LOKI_USER: "123",
    LOKI_TOKEN: "glc_test",
  });
  delete require.cache[require.resolve("./logger")];
  const fresh = require("./logger");
  fresh.logger.warn("auth.login.failed", { password: "hunter2" });
  await fresh.flush();
  server.close();

  assert.strictEqual(received.auth, `Basic ${Buffer.from("123:glc_test").toString("base64")}`);
  const [stream] = received.body.streams;
  assert.strictEqual(stream.stream.level, "warn");
  assert.ok(!stream.values[0][1].includes("hunter2"));
  assert.strictEqual(JSON.parse(stream.values[0][1]).event, "auth.login.failed");

  console.log("logger checks passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
