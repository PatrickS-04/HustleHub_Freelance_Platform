const express = require("express");
const securityHeaders = require("./middleware/securityHeaders");
const cors = require("cors");
const { globalLimiter } = require("./middleware/rateLimiters");
const authRoutes = require("./routes/authRoutes");
const gigRoutes = require("./routes/gigRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const userRoutes = require("./routes/userRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { noSqlInjection, parameterPollution } = require("./middleware/sanitize");
const requestLogger = require("./middleware/requestLogger");

const app = express();

// Only the known frontend origin may call the API from a browser, and only it
// may send credentials (the auth cookie). Everything else is blocked by CORS.
const allowedOrigins = (process.env.CORS_ORIGIN || "https://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(requestLogger); // first, so requests rejected by later middleware are logged too
app.use(securityHeaders);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(globalLimiter);
app.use(express.json({ limit: "10kb" }));
app.use(noSqlInjection);
app.use(parameterPollution);

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;