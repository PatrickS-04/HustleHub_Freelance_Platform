// Structured logs: one JSON object per line on stdout, which Docker captures.
// JSON escaping also keeps user input from forging extra log lines (log injection).
// When LOKI_URL, LOKI_USER and LOKI_TOKEN are set, the same lines are also
// pushed to Grafana Cloud Loki, so they can be searched and graphed there.
const SENSITIVE_KEY = /pass|token|secret|authorization|cookie/i;

// Safety net: anything under a sensitive key is masked, however deeply nested.
const redact = (key, value) => (SENSITIVE_KEY.test(key) ? "[REDACTED]" : value);

const format = (level, event, fields = {}) =>
  JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields }, redact);

// Loki push body: one stream per level, so Grafana can filter by {level="warn"}
// without parsing. Labels stay few and fixed; everything else is in the JSON line.
// Each entry is [timestamp in nanoseconds as a string, line].
const lokiPayload = (entries, service = "hustlehub-api") => {
  const streams = {};
  for (const { level, ms, line } of entries) {
    (streams[level] ||= []).push([`${BigInt(ms) * 1000000n}`, line]);
  }
  return {
    streams: Object.entries(streams).map(([level, values]) => ({ stream: { service, level }, values })),
  };
};

const { LOKI_URL, LOKI_USER, LOKI_TOKEN } = process.env;
const loki = LOKI_URL && LOKI_USER && LOKI_TOKEN;
const MAX_BUFFER = 1000;
let buffer = [];

// Sends what is buffered. A failed push is reported on stdout only (never
// back into Loki, which would loop) and that batch is dropped: stdout still has it.
// ponytail: no retry, add a retry queue if Loki outages lose logs that matter.
async function flush() {
  if (!buffer.length) return;
  const batch = buffer;
  buffer = [];
  try {
    const res = await fetch(LOKI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${LOKI_USER}:${LOKI_TOKEN}`).toString("base64")}`,
      },
      body: JSON.stringify(lokiPayload(batch, process.env.APP_NAME)),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.log(format("error", "logging.loki_push_failed", { message: err.message, dropped: batch.length }));
  }
}

if (loki) {
  // unref: the timer alone never keeps the process alive.
  setInterval(flush, 5000).unref();
  // docker compose stop sends SIGTERM; send the last lines before exiting.
  process.once("SIGTERM", () => flush().finally(() => process.exit(0)));
}

const write = (level, event, fields) => {
  const line = format(level, event, fields);
  console.log(line);
  if (!loki) return;
  // Oldest lines go first if Loki is down for long, so memory stays bounded.
  if (buffer.length >= MAX_BUFFER) buffer.shift();
  buffer.push({ level, ms: Date.now(), line });
  if (buffer.length >= 100) flush();
};

const logger = {
  info: (event, fields) => write("info", event, fields),
  warn: (event, fields) => write("warn", event, fields),
  error: (event, fields) => write("error", event, fields),
};

// Who and where, for tying an event back to its request. req.id is set by requestLogger.
const requestContext = (req) => ({ requestId: req.id, ip: req.ip, userId: req.user?.id });

module.exports = { logger, format, requestContext, lokiPayload, flush };
