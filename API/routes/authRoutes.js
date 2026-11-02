const express = require("express");
const { register, login, logout, updateMe, changePassword } = require("../controllers/authController");
const {
  validateRegister,
  validateLogin,
  validateProfile,
  validatePasswordChange,
} = require("../middleware/validators");
const { requireAuth } = require("../middleware/auth");
const { loginLimiter, registerLimiter, passwordLimiter } = require("../middleware/rateLimiters");
const { rejectBreachedPassword } = require("../middleware/breachedPassword");

const router = express.Router();

router.post("/register", registerLimiter, validateRegister, rejectBreachedPassword, register);
router.post("/login", loginLimiter, validateLogin, login);
router.post("/logout", logout);

// Protected route - proves the token is verified on each request.
router.get("/me", requireAuth, (req, res) => res.status(200).json({ user: req.user }));
router.patch("/me", requireAuth, validateProfile, updateMe);
// Limiter runs after requireAuth so it can count attempts per user.
router.patch("/password", requireAuth, passwordLimiter, validatePasswordChange, rejectBreachedPassword, changePassword);

module.exports = router;
