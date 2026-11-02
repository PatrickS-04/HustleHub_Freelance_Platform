const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
    // Never returned by queries unless explicitly asked for with .select("+passwordHash").
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["client", "freelancer", "admin"], default: "client" },
    // Tokens issued before this are rejected, so changing the password signs
    // out every other session (see requireAuth).
    passwordChangedAt: Date,
    // Per-account login lockout (see login in authController).
    failedLogins: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
