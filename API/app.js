const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const gigRoutes = require("./routes/gigRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Only the known frontend origin may call the API from a browser, and only it
// may send credentials (the auth cookie). Everything else is blocked by CORS.
const allowedOrigins = (process.env.CORS_ORIGIN || "https://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "10kb" }));

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/income", incomeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;