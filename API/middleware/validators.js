const validator = require("validator");
const mongoose = require("mongoose");
const { CATEGORIES } = require("../models/Gig");

const fail = (res, message) => res.status(400).json({ error: message });

function validateRegister(req, res, next) {
  // try/catch so any unexpected error during validation returns a 400, never a 500.
  try {
    const b = req.body || {};
    const name = typeof b.name === "string" ? b.name.trim() : "";
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    const password = typeof b.password === "string" ? b.password : "";

    // Role must be confirmed as a string before it is checked against the
    // whitelist, otherwise a non-string role throws inside validator.isIn()
    // and surfaces as a generic 500 instead of a 400.
    const role = typeof b.role === "string" ? b.role.trim() : null;

    if (
      !validator.isLength(name, { min: 2, max: 50 }) ||
      !validator.isAlpha(name, "en-US", { ignore: " '-" })
    ) {
      return fail(res, "Name is required and must be 2-50 letters.");
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
      return fail(
        res,
        "Password is required and must be 8-128 chars with an uppercase, lowercase and a number."
      );
    }

    if (role === null || !validator.isIn(role, ["client", "freelancer"])) {
      return fail(res, "Role must be 'client' or 'freelancer'.");
    }

    // Rebuild the body from cleaned fields only - discards any extra properties.
    req.body = { name, email, password, role };
    next();
  } catch (err) {
    return fail(res, "Invalid request data.");
  }
}

function validateLogin(req, res, next) {
  try {
    const b = req.body || {};
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    const password = typeof b.password === "string" ? b.password : "";

    if (!validator.isEmail(email) || !password) {
      return fail(res, "Email and password are required.");
    }

    // Login never takes a role - it is read from the signed JWT after auth.
    req.body = { email, password };
    next();
  } catch (err) {
    return fail(res, "Invalid request data.");
  }
}

// Gig create (all fields required) and update (partial: only the fields sent).
// Only whitelisted fields survive, so `freelancer` can never be set from the body.
const validateGig = (partial) => (req, res, next) => {
  try {
    const b = req.body || {};
    const out = {};
    const has = (k) => b[k] !== undefined;

    if (!partial || has("title")) {
      const title = typeof b.title === "string" ? b.title.trim() : "";
      if (!validator.isLength(title, { min: 5, max: 80 })) {
        return fail(res, "Title must be 5-80 characters.");
      }
      out.title = title;
    }

    if (!partial || has("description")) {
      const description = typeof b.description === "string" ? b.description.trim() : "";
      if (!validator.isLength(description, { min: 20, max: 500 })) {
        return fail(res, "Description must be 20-500 characters.");
      }
      out.description = description;
    }

    if (!partial || has("category")) {
      if (typeof b.category !== "string" || !CATEGORIES.includes(b.category)) {
        return fail(res, "Choose a valid category.");
      }
      out.category = b.category;
    }

    if (!partial || has("price")) {
      if (typeof b.price !== "number" || !Number.isFinite(b.price) || b.price < 50 || b.price > 100000) {
        return fail(res, "Price must be a number between 50 and 100000.");
      }
      out.price = b.price;
    }

    if (!partial || has("deliveryDays")) {
      if (!Number.isInteger(b.deliveryDays) || b.deliveryDays < 1 || b.deliveryDays > 60) {
        return fail(res, "Delivery time must be a whole number of 1-60 days.");
      }
      out.deliveryDays = b.deliveryDays;
    }

    if (has("active")) {
      if (typeof b.active !== "boolean") return fail(res, "Active must be true or false.");
      out.active = b.active;
    }

    if (partial && Object.keys(out).length === 0) {
      return fail(res, "No valid fields to update.");
    }

    req.body = out;
    next();
  } catch (err) {
    return fail(res, "Invalid request data.");
  }
};

// Malformed ids get a 404 instead of a Mongoose CastError (500).
function validateId(req, res, next, id) {
  if (!mongoose.isValidObjectId(id)) return res.status(404).json({ error: "Resource not found." });
  next();
}

module.exports = { validateRegister, validateLogin, validateGig, validateId };
