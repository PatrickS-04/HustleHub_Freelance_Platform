const jwt = require("jsonwebtoken");

// Short-lived token carrying only what protected routes need for authz.
function generateToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || "1h" ,
      algorithms: ["HS256"],
      issuer: [process.env.APP_NAME],
      audience: ["hustlehubClient"]
    }
  );
}

module.exports = generateToken;