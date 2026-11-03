// Run: node utils/totp.check.js
const assert = require("node:assert");
const {
  generateTotpSecret,
  matchTotp,
  hotp,
  totpUri,
  qrDataUrl,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
} = require("./totp");

process.env.JWT_SECRET = "x".repeat(32);

// RFC 6238 test vectors (the ASCII secret "12345678901234567890" in base32),
// cut down from 8 digits to the 6 that authenticator apps use
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
assert.strictEqual(hotp(RFC_SECRET, Math.floor(59 / 30)), "287082");
assert.strictEqual(hotp(RFC_SECRET, Math.floor(1111111109 / 30)), "081804");
assert.strictEqual(hotp(RFC_SECRET, Math.floor(2000000000 / 30)), "279037");

// a code matches its own step and one either side, and nothing further away
const at = 1111111109 * 1000;
const step = Math.floor(1111111109 / 30);
assert.strictEqual(matchTotp(RFC_SECRET, "081804", at), step);
assert.strictEqual(matchTotp(RFC_SECRET, "081804", at + 30_000), step);
assert.strictEqual(matchTotp(RFC_SECRET, "081804", at - 30_000), step);
assert.strictEqual(matchTotp(RFC_SECRET, "081804", at + 90_000), null);
assert.strictEqual(matchTotp(RFC_SECRET, "000000", at), null);
for (const bad of ["", "12345", "1234567", "abcdef", "a1b2c-3d4e5"]) {
  assert.strictEqual(matchTotp(RFC_SECRET, bad, at), null);
}

// a generated secret round-trips through base32
const secret = generateTotpSecret();
assert.match(secret, /^[A-Z2-7]{32}$/);
assert.strictEqual(hotp(secret, 1).length, 6);

// encryption round-trips, is different every time and detects tampering
const stored = encryptSecret(secret);
assert.notStrictEqual(stored, encryptSecret(secret));
assert.ok(!stored.includes(secret));
assert.strictEqual(decryptSecret(stored), secret);
const [iv, tag, data] = stored.split(".");
const tampered = Buffer.from(data, "base64");
tampered[0] ^= 1;
assert.throws(() => decryptSecret([iv, tag, tampered.toString("base64")].join(".")));
// a shortened tag is refused, otherwise a forgery only has to guess a few bytes
const shortTag = Buffer.from(tag, "base64").subarray(0, 4).toString("base64");
assert.throws(() => decryptSecret([iv, shortTag, data].join(".")));

// recovery codes are unique, and dashes and case don't matter when entered
const codes = generateRecoveryCodes();
assert.strictEqual(new Set(codes).size, 8);
assert.match(codes[0], /^[0-9a-f]{5}-[0-9a-f]{5}$/);
assert.strictEqual(hashRecoveryCode(codes[0]), hashRecoveryCode(codes[0].replace("-", "").toUpperCase()));
assert.notStrictEqual(hashRecoveryCode(codes[0]), hashRecoveryCode(codes[1]));

// the setup link and QR code
const uri = totpUri(secret, "a+b@example.com");
assert.ok(uri.startsWith("otpauth://totp/HustleHub%2B%3Aa%2Bb%40example.com?"));
assert.ok(uri.includes(`secret=${secret}`));
assert.match(qrDataUrl(uri), /^data:image\/gif;base64,/);

console.log("totp.check.js passed");
