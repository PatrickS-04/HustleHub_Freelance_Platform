// Run: node middleware/auth.check.js
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { login, SALT_ROUNDS } = require("../controllers/authController");
const { validatePasswordChange } = require("./validators");
const { tokenFromRequest, issuedBeforePasswordChange } = require("./auth");

// cookie wins over header
assert.strictEqual(
  tokenFromRequest({ headers: { cookie: "a=1; token=abc.def.ghi; b=2", authorization: "Bearer nope" } }),
  "abc.def.ghi"
);
// falls back to Bearer header when no cookie
assert.strictEqual(
  tokenFromRequest({ headers: { authorization: "Bearer xyz.123" } }),
  "xyz.123"
);
// url-encoded cookie value is decoded
assert.strictEqual(
  tokenFromRequest({ headers: { cookie: "token=a%2Bb" } }),
  "a+b"
);
// nothing -> null
assert.strictEqual(tokenFromRequest({ headers: {} }), null);

// tokens issued before a password change are rejected, the new one is not
const changedAt = new Date(1_700_000_000_000);
assert.ok(issuedBeforePasswordChange({ iat: 1_699_999_999 }, { passwordChangedAt: changedAt }));
assert.ok(!issuedBeforePasswordChange({ iat: 1_700_000_000 }, { passwordChangedAt: changedAt }));
assert.ok(!issuedBeforePasswordChange({ iat: 1 }, {})); // never changed

// an unknown email still costs a full bcrypt compare, so timing can't reveal it
(async () => {
  User.findOne = () => ({ select: async () => null });
  const realCompare = bcrypt.compare;
  const compared = [];
  bcrypt.compare = (password, hash) => {
    compared.push(hash);
    return realCompare(password, hash);
  };

  let status;
  const res = { status(code) { status = code; return this; }, json() { return this; } };
  await login({ body: { email: "nobody@example.com", password: "Password1" }, headers: {} }, res, assert.fail);

  assert.strictEqual(status, 401);
  assert.strictEqual(compared.length, 1);
  assert.strictEqual(bcrypt.getRounds(compared[0]), SALT_ROUNDS);
  bcrypt.compare = realCompare;

  // account lockout, against a fake in-memory user
  process.env.JWT_SECRET = "x".repeat(32);
  process.env.APP_NAME = "check";
  const passwordHash = bcrypt.hashSync("Password1", 4);
  let stored;
  User.findOne = () => ({ select: async () => stored });
  User.findByIdAndUpdate = (id, update) => ({
    select: async () => {
      stored.failedLogins = (stored.failedLogins || 0) + update.$inc.failedLogins;
      return stored;
    },
  });
  User.updateOne = async (filter, update) => Object.assign(stored, update);
  const attempt = async (password) => {
    const out = {};
    const response = {
      status(code) { out.status = code; return this; },
      json() { return this; },
      cookie() { out.cookie = true; },
    };
    await login({ body: { email: "a@example.com", password }, headers: {} }, response, assert.fail);
    await new Promise(setImmediate); // the failure count is recorded in the background
    return out;
  };

  // nine wrong passwords don't lock; the tenth does and restarts the count
  stored = { id: "1", passwordHash };
  for (let i = 0; i < 9; i++) await attempt("Wrong1234");
  assert.strictEqual(stored.failedLogins, 9);
  assert.strictEqual(stored.lockedUntil, undefined);
  await attempt("Wrong1234");
  assert.strictEqual(stored.failedLogins, 0);
  assert.ok(stored.lockedUntil > Date.now());

  // locked: the right password gets the same 401 and no cookie
  const locked = await attempt("Password1");
  assert.strictEqual(locked.status, 401);
  assert.ok(!locked.cookie);

  // lock expired: the right password works
  stored.lockedUntil = new Date(Date.now() - 1000);
  const unlocked = await attempt("Password1");
  assert.strictEqual(unlocked.status, 200);
  assert.ok(unlocked.cookie);

  // a successful login clears earlier failures
  stored = { id: "1", passwordHash, failedLogins: 3 };
  await attempt("Password1");
  assert.strictEqual(stored.failedLogins, 0);

  // new passwords are limited to 72 bytes, not 72 characters
  const newPasswordStatus = (newPassword) => {
    let code = 200;
    validatePasswordChange(
      { body: { currentPassword: "Old12345", newPassword } },
      { status(c) { code = c; return this; }, json() { return this; } },
      () => {}
    );
    return code;
  };
  assert.strictEqual(newPasswordStatus("Aa1" + "x".repeat(69)), 200);
  assert.strictEqual(newPasswordStatus("Aa1" + "x".repeat(70)), 400);
  assert.strictEqual(newPasswordStatus("Aa1" + "é".repeat(35)), 400);

  console.log("auth.check.js passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
