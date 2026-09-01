
const validator = require("validator");

const fail = (res, message) => res.status(400).json({ error: message });

function validateRegister(req, res, next) {
  const b = req.body || {};
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const role = b.role === undefined ? "client" : b.role;

  if (
    !validator.isLength(name, { min: 2, max: 50 }) ||
    !validator.isAlpha(name, "en-US", { ignore: " '-" })
  ) {
    return fail(res, "Name must be 2-50 letters.");
  }

  if (!validator.isEmail(email) || !validator.isLength(email, { max: 254 })) {
    return fail(res, "A valid email address is required.");
  }

  if (
    !validator.isLength(password, { min: 8, max: 128 }) ||
    !validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    })
  ) {
    return fail(res, "Password must be 8-128 chars with upper, lower and a number.");
  }

  if (!validator.isIn(role, ["client", "freelancer"])) {
    return fail(res, "Role must be 'client' or 'freelancer'.");
  }

  req.body = { name, email, password, role };
  next();
}

function validateLogin(req, res, next) {
  const b = req.body || {};
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  if (!validator.isEmail(email) || !password) {
    return fail(res, "Email and password are required.");
  }
  req.body = { email, password };
  next();
}

module.exports = { validateRegister, validateLogin };