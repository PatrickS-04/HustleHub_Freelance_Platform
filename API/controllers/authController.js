const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const SALT_ROUNDS = 12;

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    //Checking if name, email and password are populated
    if (!name || !email || !password || !role) 
    {
      return res.status(400).json({ error: 'Name, email, password and role are required fields.' });
    }

    //Checking that name, email, password and role are string values
    if ( typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || typeof role !== 'string')
    {
      return res.status(400).json({ error: 'Name, email, password and role must be text values.' });
    }

    //Checking that name, email, password and role are not empty strings
    if (name.trim() === '' || email.trim() === '' || password.trim() === '' || role.trim() === '')
    {
      return res.status(400).json({ error: 'Name, email, password and role cannot be empty strings.' });
    }

    //Checking that the password entered is at least 8 characters long
    if (password.length < 8) 
    {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      // 409 Conflict - generic enough not to help enumerate accounts further
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.createUser({ name, email, passwordHash, role });

    const token = generateToken(user);

    return res.status(201).json({
      message: "User registered successfully.",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } 
  catch (err) 
  {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    //Checking if the email and password are populated
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = User.findByEmail(email);

    // Deliberately identical response whether the email doesn't exist or the
    // password is wrong - prevents attackers from enumerating valid accounts.
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
