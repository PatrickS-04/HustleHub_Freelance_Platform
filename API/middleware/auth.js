const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Token is read from the httpOnly cookie first (browser clients), then from an
// Authorization: Bearer header (Postman / Newman, which have no cookie jar).
// ponytail: hand-rolled single-cookie read - not worth adding cookie-parser for one value
function tokenFromRequest(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);

  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

// JWT `iat` is in whole seconds and passwordChangedAt is stored rounded down to
// the second, so the token issued in the same request as the change stays valid.
// ponytail: second granularity - a token minted in that same second elsewhere survives; store a token version if that matters
const issuedBeforePasswordChange = (payload, user) =>
  Boolean(user.passwordChangedAt) &&
  payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000);

async function requireAuth(req, res, next) {
  const token = tokenFromRequest(req);
  if (!token) return res.status(401).json({ error: "Authentication required." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: [process.env.APP_NAME],
      audience: ["hustlehubClient"]
    });
    // Also rejects tokens for deleted users. A malformed sub throws a CastError,
    // which lands in the catch below as a 401.
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "Authentication required." });
    if (issuedBeforePasswordChange(payload, user)) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Role gate - not needed for Part 1, but Part 2 RBAC plugs straight in.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, tokenFromRequest, issuedBeforePasswordChange };
