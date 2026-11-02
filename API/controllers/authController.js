const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { tokenFromRequest, userFromToken } = require("../middleware/auth");
const { logger, requestContext } = require("../utils/logger");

const SALT_ROUNDS = 12;
const COOKIE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour, matches the JWT expiry
// Compared against when the email is unknown, so that login takes as long as a
// wrong password and response time can't reveal which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync("no-account-has-this-hash", SALT_ROUNDS);
// Catches guessing spread across many IPs, which loginLimiter can't see. Set
// above that limiter's 5 per IP so one person mistyping hits the limiter first
// and is told to wait. Temporary, so an attacker can't lock someone out for good.
const MAX_FAILED_LOGINS = 10;
const LOCK_MS = 15 * 60 * 1000;

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

// Counts a wrong password and locks the account once the limit is reached.
// Limitation: failures only clear on a successful login or a lock, so old ones add up; store the first failure's time if that locks people out.
async function recordFailedLogin(req, user) {
  const updated = await User.findByIdAndUpdate(
    user.id,
    { $inc: { failedLogins: 1 } },
    { returnDocument: "after" }
  ).select("+failedLogins");
  if (!updated || updated.failedLogins < MAX_FAILED_LOGINS) return;

  await User.updateOne(
    { _id: user.id },
    { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) }
  );
  logger.warn("auth.account_locked", { ...requestContext(req), userId: user.id });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select("+passwordHash +failedLogins +lockedUntil");

    // Deliberately identical response whether the email doesn't exist or the
    // password is wrong - prevents attackers from enumerating valid accounts.
    // The log may record the real reason; it is never sent to the client. The
    // submitted email is left out: people sometimes type a password in that box.
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      logger.warn("auth.login.failed", { ...requestContext(req), reason: "unknown_email" });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Compared even when locked, and answered with the same 401, so neither the
    // response nor its timing shows that the account exists or is locked.
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (user.lockedUntil > Date.now()) {
      logger.warn("auth.login.failed", { ...requestContext(req), reason: "account_locked", userId: user.id });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!passwordMatches) {
      // Not awaited: unknown emails do no database write, so waiting here would
      // make wrong passwords measurably slower and reveal the account exists.
      recordFailedLogin(req, user).catch((err) =>
        logger.error("auth.login.record_failed", { ...requestContext(req), userId: user.id, message: err.message })
      );
      logger.warn("auth.login.failed", { ...requestContext(req), reason: "wrong_password", userId: user.id });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (user.failedLogins) await User.updateOne({ _id: user.id }, { failedLogins: 0 });

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
// Every other session is signed out (requireAuth rejects tokens with an old
// tokenVersion) and this one gets a fresh token so it stays logged in.
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
    user.tokenVersion += 1;
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
// Also revokes the user's tokens, so a stolen copy stops working too. That signs
// out all their devices. Only a currently valid token can do this, so an old
// stolen one can't be replayed here to keep signing them out. Failures are logged
// rather than returned because the cookie must still be cleared.
async function logout(req, res) {
  const token = tokenFromRequest(req);
  if (token) {
    try {
      const user = await userFromToken(token);
      if (user) await User.updateOne({ _id: user.id }, { $inc: { tokenVersion: 1 } });
    } catch (err) {
      logger.warn("auth.logout.revoke_failed", { ...requestContext(req), message: err.message });
    }
  }
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "strict" });
  return res.status(200).json({ message: "Logged out." });
}

module.exports = { register, login, logout, updateMe, changePassword, SALT_ROUNDS };
