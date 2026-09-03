// In-memory storage
// This will be swapped for a MongoDB (Mongoose) model in a later part

const users = [];

let nextId = 1;

function findByEmail(email) {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function findById(id) {
  return users.find((u) => u.id === id);
}

function createUser({ name, email, passwordHash, role }) {
  const user = {
    id: nextId++,
    name,
    email,
    passwordHash,
    role: role || "client", // "client" | "freelancer" | "admin"
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

// `users` stays module-private - callers go through the accessors above.
module.exports = { findByEmail, findById, createUser };
