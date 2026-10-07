const express = require("express");
const { register, login } = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../middleware/validators");
const { requireAuth } = require("../middleware/auth");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

router.post("/register", registerLimiter, validateRegister, register);
router.post("/login", loginLimiter, validateLogin, login);

// Protected route - proves the token is verified on each request.
router.get("/me", requireAuth, (req, res) => res.status(200).json({ user: req.user }));

module.exports = router;