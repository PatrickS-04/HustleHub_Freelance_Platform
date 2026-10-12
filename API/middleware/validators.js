const validator = require("validator");
const mongoose = require("mongoose");
const { CATEGORIES } = require("../models/Gig");
const { STATUSES } = require("../models/Booking");

const fail = (res, message) => res.status(400).json({ error: message });

// Letters plus spaces, apostrophes and hyphens, so no markup can get through.
const NAME_ERROR = "Name is required and must be 2-50 letters.";
const isValidName = (name) =>
  validator.isLength(name, { min: 2, max: 50 }) &&
  validator.isAlpha(name, "en-US", { ignore: " '-" });

const PASSWORD_ERROR =
  "Password is required and must be 8-128 chars with an uppercase, lowercase and a number.";
const isStrongPassword = (password) =>
  validator.isLength(password, { min: 8, max: 128 }) &&
  validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  });

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

    if (!isValidName(name)) return fail(res, NAME_ERROR);

    if (!validator.isEmail(email) || !validator.isLength(email, { max: 254 })) {
      return fail(res, "A valid email address is required.");
    }

    if (!isStrongPassword(password)) return fail(res, PASSWORD_ERROR);

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

// Profile update: only the display name can change. Email and role are
// dropped when the body is rebuilt, so they can't be changed through here.
function validateProfile(req, res, next) {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!isValidName(name)) return fail(res, NAME_ERROR);
  req.body = { name };
  next();
}

// Password change: the current password (checked against the hash in the
// controller) and a new one that meets the registration rule and differs.
function validatePasswordChange(req, res, next) {
  const b = req.body || {};
  const currentPassword = typeof b.currentPassword === "string" ? b.currentPassword : "";
  const newPassword = typeof b.newPassword === "string" ? b.newPassword : "";

  if (!currentPassword || currentPassword.length > 128) {
    return fail(res, "Enter your current password.");
  }
  if (!isStrongPassword(newPassword)) return fail(res, PASSWORD_ERROR);
  if (newPassword === currentPassword) {
    return fail(res, "Choose a new password that differs from the current one.");
  }

  req.body = { currentPassword, newPassword };
  next();
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

const DAY_MS = 24 * 60 * 60 * 1000;

function validateBooking(req, res, next) {
  try {
    const b = req.body || {};
    if (typeof b.gigId !== "string" || !mongoose.isValidObjectId(b.gigId)) {
      return fail(res, "A valid gig is required.");
    }

    const date = typeof b.date === "string" ? b.date : "";
    if (!validator.isDate(date, { format: "YYYY-MM-DD", strictMode: true })) {
      return fail(res, "Start date must be a valid date (YYYY-MM-DD).");
    }
    // One day of slack so a client ahead of UTC can still book "today".
    const start = Date.parse(`${date}T00:00:00Z`);
    if (start < Date.now() - DAY_MS) return fail(res, "The start date cannot be in the past.");
    if (start > Date.now() + 365 * DAY_MS) return fail(res, "The start date must be within a year.");

    const note = b.note === undefined ? "" : b.note;
    if (typeof note !== "string" || note.trim().length > 300) {
      return fail(res, "Notes must be 300 characters or fewer.");
    }

    // Price, client and freelancer are never taken from the body.
    req.body = { gigId: b.gigId, date, note: note.trim() };
    next();
  } catch (err) {
    return fail(res, "Invalid request data.");
  }
}

function validateStatus(req, res, next) {
  const status = req.body?.status;
  if (typeof status !== "string" || !STATUSES.includes(status) || status === "Pending") {
    return fail(res, "Status must be Accepted, Declined, Completed or Cancelled.");
  }
  req.body = { status };
  next();
}

function validateReview(req, res, next) {
  const b = req.body || {};
  if (!Number.isInteger(b.rating) || b.rating < 1 || b.rating > 5) {
    return fail(res, "Rating must be a whole number from 1 to 5.");
  }
  const text = b.text === undefined ? "" : b.text;
  if (typeof text !== "string" || text.trim().length > 300) {
    return fail(res, "Comments must be 300 characters or fewer.");
  }
  req.body = { rating: b.rating, text: text.trim() };
  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateProfile,
  validatePasswordChange,
  validateGig,
  validateId,
  validateBooking,
  validateStatus,
  validateReview,
};
