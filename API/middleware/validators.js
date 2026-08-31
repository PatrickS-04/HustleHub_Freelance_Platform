
const PATTERNS = {
  name: /^[A-Za-z][A-Za-z '-]{1,49}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/,
  role: /^(client|freelancer)$/,
};

const fail = (res, message) => res.status(400).json({ error: message });

function validateRegister(req, res, next) {
  const b = req.body || {};
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const role = b.role === undefined ? "client" : b.role;

  if (!PATTERNS.name.test(name)) return fail(res, "Name must be 2-50 letters.");
  if (!PATTERNS.email.test(email) || email.length > 254)
    return fail(res, "A valid email address is required.");
  if (!PATTERNS.password.test(password))
    return fail(res, "Password must be 8-128 chars with upper, lower and a number.");
  if (!PATTERNS.role.test(role))
    return fail(res, "Role must be 'client' or 'freelancer'.");

  req.body = { name, email, password, role }; // pass only sanitised values on
  next();
}

function validateLogin(req, res, next) {
  const b = req.body || {};
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  if (!PATTERNS.email.test(email) || !password)
    return fail(res, "Email and password are required.");
  req.body = { email, password };
  next();
}

module.exports = { validateRegister, validateLogin };