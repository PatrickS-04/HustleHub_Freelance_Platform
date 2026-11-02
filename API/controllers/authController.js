const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { logger, requestContext } = require("../utils/logger");

const SALT_ROUNDS = 12;
const COOKIE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour, matches the JWT expiry

// The httpOnly cookie is the real token transport. The token is echoed in the
// JSON body only when EXPOSE_TOKEN_IN_BODY=true (for Postman / Newman, which have
// no cookie jar). Off by default, so a normal deployment never returns the token
// in a response body.
const tokenInBody = (token) =>
  process.env.EXPOSE_TOKEN_IN_BODY === "true" ? { token } : {};

// The JWT lives in an httpOnly cookie so page JavaScript can never read it.
// Secure = HTTPS only; SameSite=Strict = not sent on cross-site requests (CSRF).
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    // Defence in depth: validateRegister already enforces shape and content,
    // but guard here too in case the controller is ever wired without it.
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof role !== "string"
    ) {
      return res
        .status(400)
        .json({ error: "Name, email, password and role are required." });
    }

    const existing = await User.exists({ email });
    if (existing) {
      // 409 Conflict - generic enough not to help enumerate accounts further
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash, role });

    const token = generateToken(user);
    setAuthCookie(res, token);
    logger.info("auth.register.success", { ...requestContext(req), userId: user.id, role: user.role });

    return res.status(201).json({
      message: "User registered successfully.",
      ...tokenInBody(token),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: "Invalid registration data." });
    }
    // Unique index caught a duplicate that slipped past the exists() check (race).
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select("+passwordHash");

    // Deliberately identical response whether the email doesn't exist or the
    // password is wrong - prevents attackers from enumerating valid accounts.
    // The log may record the real reason; it is never sent to the client. The
    // submitted email is left out: people sometimes type a password in that box.
    if (!user) {
      logger.warn("auth.login.failed", { ...requestContext(req), reason: "unknown_email" });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      logger.warn("auth.login.failed", { ...requestContext(req), reason: "wrong_password", userId: user.id });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);
    logger.info("auth.login.success", { ...requestContext(req), userId: user.id, role: user.role });

    return res.status(200).json({
      message: "Login successful.",
      ...tokenInBody(token),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

// Updates the logged-in user's display name. The user comes from the verified
// JWT, so nobody can rename another account. Gigs and bookings look the name
// up when they are read, so the new name shows everywhere straight away.
async function updateMe(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: req.body.name },
      { returnDocument: "after", runValidators: true }
    );
    if (!user) return res.status(401).json({ error: "Authentication required." });

    return res.status(200).json({
      message: "Profile updated.",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: "Invalid profile data." });
    }
    next(err);
  }
}

// Changes the logged-in user's password after checking the current one.
// Every other session is signed out (requireAuth rejects tokens issued before
// passwordChangedAt) and this one gets a fresh token so it stays logged in.
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select("+passwordHash");
    if (!user) return res.status(401).json({ error: "Authentication required." });

    // 400 rather than 401: a 401 would make the frontend sign the user out.
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      logger.warn("auth.password_change.failed", requestContext(req));
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    // Whole seconds, to line up with the JWT `iat` claim.
    user.passwordChangedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    await user.save();

    const token = generateToken(user);
    setAuthCookie(res, token);
    logger.info("auth.password_change.success", requestContext(req));

    return res.status(200).json({
      message: "Password changed. Other sessions have been signed out.",
      ...tokenInBody(token),
    });
  } catch (err) {
    next(err);
  }
}

// The cookie is httpOnly, so only the server can remove it. Attributes must
// match those used in setAuthCookie or the browser will not clear it.
function logout(req, res) {
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "strict" });
  return res.status(200).json({ message: "Logged out." });
}

module.exports = { register, login, logout, updateMe, changePassword };
