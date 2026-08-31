const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const SALT_ROUNDS = 12;

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    const existing = User.findByEmail(email);
    if (existing) {
      // 409 Conflict - generic enough not to help enumerate accounts further
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = User.createUser({ name, email, passwordHash, role });

    const token = generateToken(user);

    return res.status(201).json({
      message: "User registered successfully.",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = User.findByEmail(email);

    // Deliberately identical response whether the email doesn't exist or the
    // password is wrong - prevents attackers from enumerating valid accounts.
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
