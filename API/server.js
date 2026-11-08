require("dotenv").config();
const fs = require("fs");
const https = require("https");
const app = require("./app");
const connectDB = require("./config/db");
const { logger, flush } = require("./utils/logger");

const PORT = process.env.PORT || 3443;

if (!process.env.JWT_SECRET) {
  logger.error("server.config_invalid", { message: "JWT_SECRET is not set. Refusing to start." });
  process.exit(1);
}

//Added a check to ensure that the JWT_SECRET is at least 32 characters long for security reasons. If it is not, the server will refuse to start and log an error message.
if (process.env.JWT_SECRET.length < 32) {
  logger.error("server.config_invalid", { message: "JWT_SECRET must be at least 32 characters long. Refusing to start." });
  process.exit(1);
}

const options = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  minVersion: "TLSv1.2",
};

if (!process.env.MONGO_URL) {
  logger.error("server.config_invalid", { message: "MONGO_URL is not set. Refusing to start." });
  process.exit(1);
}

// Any start-up failure is logged (and sent to Grafana) before exiting, instead of
// surfacing as an unhandled rejection. flush() never rejects, so void is safe.
function failStart(err) {
  logger.error("server.start_failed", { message: err.message });
  void flush().finally(() => process.exit(1));
}

// Only accept traffic once the database is reachable (connectDB exits on failure).
// listen() reports problems such as a port in use as an "error" event, not a throw.
connectDB()
  .then(() =>
    https
      .createServer(options, app)
      .on("error", failStart)
      .listen(PORT, () => logger.info("server.started", { url: `https://localhost:${PORT}` }))
  )
  .catch(failStart);