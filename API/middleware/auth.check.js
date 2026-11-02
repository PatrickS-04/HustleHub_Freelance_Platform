// Run: node middleware/auth.check.js
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { login, SALT_ROUNDS } = require("../controllers/authController");
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

  console.log("auth.check.js passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
