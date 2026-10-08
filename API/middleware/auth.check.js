// Run: node middleware/auth.check.js
const assert = require("node:assert");
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

console.log("auth.check.js passed");
