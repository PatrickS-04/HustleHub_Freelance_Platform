const express = require("express");
const {
  register,
  login,
  logout,
  updateMe,
  changePassword,
  mfaSetup,
  mfaEnable,
  mfaDisable,
} = require("../controllers/authController");
const {
  validateRegister,
  validateLogin,
  validateProfile,
  validatePasswordChange,
  validateMfaSetup,
  validateMfaEnable,
  validateMfaDisable,
} = require("../middleware/validators");
const { requireAuth } = require("../middleware/auth");
const { loginLimiter, registerLimiter, passwordLimiter, mfaLimiter } = require("../middleware/rateLimiters");
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
router.post("/mfa/setup", requireAuth, mfaLimiter, validateMfaSetup, mfaSetup);
router.post("/mfa/enable", requireAuth, mfaLimiter, validateMfaEnable, mfaEnable);
router.post("/mfa/disable", requireAuth, mfaLimiter, validateMfaDisable, mfaDisable);

module.exports = router;
