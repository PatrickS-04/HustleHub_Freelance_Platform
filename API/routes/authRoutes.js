const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, login, logout } = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../middleware/validators");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Blunt brute-force / enumeration slowdown on auth endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});

router.post("/register", authLimiter, validateRegister, register);
router.post("/login", authLimiter, validateLogin, login);
router.post("/logout", logout);

// Protected route - proves the token is verified on each request.
router.get("/me", requireAuth, (req, res) => res.status(200).json({ user: req.user }));

module.exports = router;