const jwt = require("jsonwebtoken");
const User = require("../models/User");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, algorithms = ["HS256"]);
    const user = User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "Authentication required." });
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

module.exports = { requireAuth, requireRole };
