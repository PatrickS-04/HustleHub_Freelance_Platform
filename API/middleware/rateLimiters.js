const rateLimit = require('express-rate-limit');

function createRateLimiter({ windowMs, max, message, keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    handler: (req, res) => {
      res.status(429).json({ error: message });
    }
  });
}

  const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again in 15 minutes.'
  });

  const registerLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many registration attempts, please try again in 15 minutes.'
  });

  const bookingLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: 'Too many booking requests, please wait a few minutes and try again.',
    keyGenerator: (req) => (req.user ? `user:${req.user.id}` : req.ip)
  });

  // Per user: stops someone with a stolen session guessing the current password.
  const passwordLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many password change attempts, please try again in 15 minutes.',
    keyGenerator: (req) => (req.user ? `user:${req.user.id}` : req.ip)
  });

  const globalLimiter = createRateLimiter({
    windowMs: 15 *60 * 1000,
    max: 300,
    message: 'Too many requests, please slow down and try again later.'
  });

module.exports = { loginLimiter, registerLimiter, bookingLimiter, passwordLimiter, globalLimiter };