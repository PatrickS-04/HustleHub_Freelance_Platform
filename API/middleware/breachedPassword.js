const crypto = require("crypto");
const { logger, requestContext } = require("../utils/logger");

const TIMEOUT_MS = 2000;

// Asks Have I Been Pwned whether a password has appeared in a known data breach.
// Only the first 5 characters of its SHA-1 hash leave the server (k-anonymity),
// and the match happens here. SHA-1 is what that API requires; it is not used to
// store anything. Add-Padding hides the real size of the response, and its filler
// entries have a count of 0.
async function isBreached(password) {
  const hash = crypto.createHash("sha1").update(password).digest("hex").toUpperCase(); // NOSONAR // nosemgrep
  const suffix = hash.slice(5);
  const response = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
    headers: { "Add-Padding": "true" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Breach check returned ${response.status}`);

  const lines = (await response.text()).split(/\r?\n/);
  return lines.some((line) => {
    const [candidate, count] = line.split(":");
    return candidate === suffix && Number(count) > 0;
  });
}

// Runs after the validators, so the password is already a string that meets the
// rules. If the service is unavailable the password is allowed: an outage
// elsewhere shouldn't stop people registering or changing a password.
async function rejectBreachedPassword(req, res, next) {
  try {
    if (await isBreached(req.body.newPassword ?? req.body.password)) {
      return res.status(400).json({
        error: "This password has appeared in a data breach. Please choose a different one.",
      });
    }
  } catch (err) {
    logger.warn("auth.breach_check.unavailable", { ...requestContext(req), message: err.message });
  }
  next();
}

module.exports = { rejectBreachedPassword };
