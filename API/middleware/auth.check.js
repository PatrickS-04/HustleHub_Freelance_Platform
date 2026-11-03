// Run: node middleware/auth.check.js
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const generateToken = require("../utils/generateToken");
const {
  login,
  logout,
  changePassword,
  mfaSetup,
  mfaEnable,
  mfaDisable,
  SALT_ROUNDS,
} = require("../controllers/authController");
const { getBooking } = require("../controllers/bookingController");
const {
  generateTotpSecret,
  hotp,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
} = require("../utils/totp");
const { validatePasswordChange } = require("./validators");
const { rejectBreachedPassword } = require("./breachedPassword");
const { tokenFromRequest, userFromToken, requireRole, isAdminWithMfa } = require("./auth");

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

  // token revocation, against a fake in-memory user
  const fakeRes = () => ({
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    cookie() {},
    clearCookie() { this.cleared = true; },
  });
  User.findById = () => Object.assign(Promise.resolve(stored), { select: async () => stored });
  User.updateOne = async (filter, update) => {
    stored.tokenVersion += update.$inc.tokenVersion;
  };
  const session = (token) => ({ headers: { authorization: `Bearer ${token}` } });
  stored = { id: "1", role: "client", tokenVersion: 0, passwordHash, save: async () => {} };

  // a token matches until the version moves on
  const token = generateToken(stored);
  assert.strictEqual(await userFromToken(token), stored);

  // a token from before tokenVersion existed still counts as version 0
  const oldStyle = jwt.sign({ sub: "1" }, process.env.JWT_SECRET, { issuer: "check", audience: ["hustlehubClient"] });
  assert.strictEqual(await userFromToken(oldStyle), stored);

  // logout revokes the token and clears the cookie
  let out = fakeRes();
  await logout(session(token), out);
  assert.strictEqual(stored.tokenVersion, 1);
  assert.ok(out.cleared);
  assert.strictEqual(await userFromToken(token), null);

  // replaying the revoked token can't sign the user out of newer sessions
  out = fakeRes();
  await logout(session(token), out);
  assert.strictEqual(stored.tokenVersion, 1);
  assert.ok(out.cleared);

  // a garbage token, or none, still logs out cleanly
  for (const req of [session("garbage"), { headers: {} }]) {
    out = fakeRes();
    await logout(req, out);
    assert.strictEqual(out.code, 200);
    assert.ok(out.cleared);
    assert.strictEqual(stored.tokenVersion, 1);
  }

  // changing the password revokes old tokens and returns one that works
  const beforeChange = generateToken(stored);
  process.env.EXPOSE_TOKEN_IN_BODY = "true";
  out = fakeRes();
  await changePassword(
    { user: { id: "1" }, body: { currentPassword: "Password1", newPassword: "Newpassw0rd456" }, headers: {} },
    out,
    assert.fail
  );
  assert.strictEqual(out.code, 200);
  assert.strictEqual(await userFromToken(beforeChange), null);
  assert.strictEqual(await userFromToken(out.body.token), stored);

  // two-factor login, against a fake in-memory user
  const currentCode = (secret) => hotp(secret, Math.floor(Date.now() / 30000));
  const mfaSecret = generateTotpSecret();
  const recovery = generateRecoveryCodes();
  const mfaUser = () => ({
    id: "1",
    role: "client",
    passwordHash,
    tokenVersion: 0,
    mfaEnabled: true,
    mfaSecret: encryptSecret(mfaSecret),
    mfaRecoveryHashes: recovery.map(hashRecoveryCode),
    save: async () => {},
  });
  User.updateOne = async (filter, update) => {
    if (update.$pull) {
      const hash = update.$pull.mfaRecoveryHashes;
      if (!stored.mfaRecoveryHashes.includes(hash)) return { modifiedCount: 0 };
      stored.mfaRecoveryHashes = stored.mfaRecoveryHashes.filter((h) => h !== hash);
      return { modifiedCount: 1 };
    }
    if (update.mfaLastStep && stored.mfaLastStep >= update.mfaLastStep) return { modifiedCount: 0 };
    Object.assign(stored, update);
    return { modifiedCount: 1 };
  };
  const loginWith = async (password, code) => {
    const response = fakeRes();
    let cookie = false;
    response.cookie = () => { cookie = true; };
    await login({ body: { email: "a@example.com", password, code }, headers: {} }, response, assert.fail);
    return { code: response.code, body: response.body, cookie };
  };

  stored = mfaUser();
  // the right password alone gets no session or token
  let result = await loginWith("Password1");
  assert.deepStrictEqual(result.body, { mfaRequired: true });
  assert.ok(!result.cookie);
  // the wrong password never reveals that a code is needed
  result = await loginWith("Wrong1234");
  assert.strictEqual(result.code, 401);
  assert.ok(!result.body.mfaRequired);
  await new Promise(setImmediate);
  stored.failedLogins = 0;
  // a wrong code fails and counts towards the lockout
  result = await loginWith("Password1", "000000");
  assert.strictEqual(result.code, 401);
  assert.ok(!result.cookie);
  assert.strictEqual(stored.failedLogins, 1);
  // a code without the right password is no use
  result = await loginWith("Wrong1234", currentCode(mfaSecret));
  assert.strictEqual(result.code, 401);
  assert.ok(!result.cookie);
  await new Promise(setImmediate);
  // the right code signs in, and earlier failures are cleared
  result = await loginWith("Password1", currentCode(mfaSecret));
  assert.strictEqual(result.code, 200);
  assert.ok(result.cookie);
  assert.strictEqual(result.body.user.mfaEnabled, true);
  assert.strictEqual(stored.failedLogins, 0);
  // the same code can't be used twice
  result = await loginWith("Password1", currentCode(mfaSecret));
  assert.strictEqual(result.code, 401);
  // a recovery code works once, however it's typed
  result = await loginWith("Password1", recovery[0].toUpperCase());
  assert.strictEqual(result.code, 200);
  assert.strictEqual(stored.mfaRecoveryHashes.length, 7);
  result = await loginWith("Password1", recovery[0]);
  assert.strictEqual(result.code, 401);
  // a locked account stays locked, even with the right password and code
  stored = { ...mfaUser(), lockedUntil: new Date(Date.now() + 60_000) };
  result = await loginWith("Password1", currentCode(mfaSecret));
  assert.strictEqual(result.code, 401);
  assert.ok(!result.cookie);
  // a wrong code from the ninth failure on triggers the lock
  stored = { ...mfaUser(), failedLogins: 9 };
  await loginWith("Password1", "000000");
  assert.ok(stored.lockedUntil > Date.now());

  // turning it on and off
  const mfaCall = async (handler, body) => {
    const response = fakeRes();
    await handler({ user: { id: "1" }, body, headers: {} }, response, assert.fail);
    return response;
  };
  stored = { id: "1", role: "client", passwordHash, tokenVersion: 0, mfaEnabled: false, save: async () => {} };
  // setup needs the password
  out = await mfaCall(mfaSetup, { password: "Wrong1234" });
  assert.strictEqual(out.code, 400);
  assert.strictEqual(stored.mfaSecret, undefined);
  out = await mfaCall(mfaEnable, { code: "123456" });
  assert.strictEqual(out.code, 400); // setup hasn't been started
  // setup returns the secret and stores it encrypted, but doesn't turn anything on
  out = await mfaCall(mfaSetup, { password: "Password1" });
  assert.strictEqual(out.code, 200);
  const { secret: newSecret } = out.body;
  assert.ok(out.body.qrCode.startsWith("data:image/"));
  assert.ok(!stored.mfaSecret.includes(newSecret));
  assert.strictEqual(decryptSecret(stored.mfaSecret), newSecret);
  assert.strictEqual(stored.mfaEnabled, false);
  // a wrong code doesn't turn it on
  out = await mfaCall(mfaEnable, { code: "000000" });
  assert.strictEqual(out.code, 400);
  assert.strictEqual(stored.mfaEnabled, false);
  // the right code does, and other sessions are revoked
  const beforeEnable = generateToken(stored);
  const enableCode = currentCode(newSecret);
  out = await mfaCall(mfaEnable, { code: enableCode });
  assert.strictEqual(out.code, 200);
  assert.strictEqual(stored.mfaEnabled, true);
  assert.strictEqual(out.body.recoveryCodes.length, 8);
  assert.ok(!stored.mfaRecoveryHashes.includes(out.body.recoveryCodes[0]));
  assert.strictEqual(await userFromToken(beforeEnable), null);
  assert.strictEqual(await userFromToken(out.body.token), stored);
  // setup can't overwrite a secret that's in use
  assert.strictEqual((await mfaCall(mfaSetup, { password: "Password1" })).code, 409);
  assert.strictEqual((await mfaCall(mfaEnable, { code: enableCode })).code, 409);
  // the code used to turn it on can't then be used to log in
  assert.strictEqual((await loginWith("Password1", enableCode)).code, 401);
  // turning it off needs both the password and a valid code
  const newRecovery = out.body.recoveryCodes;
  assert.strictEqual((await mfaCall(mfaDisable, { password: "Wrong1234", code: newRecovery[0] })).code, 400);
  assert.strictEqual(stored.mfaRecoveryHashes.length, 8); // a wrong password doesn't spend the code
  assert.strictEqual((await mfaCall(mfaDisable, { password: "Password1", code: "000000" })).code, 400);
  assert.strictEqual(stored.mfaEnabled, true);
  const beforeDisable = generateToken(stored);
  out = await mfaCall(mfaDisable, { password: "Password1", code: newRecovery[0] });
  assert.strictEqual(out.code, 200);
  assert.strictEqual(stored.mfaEnabled, false);
  assert.strictEqual(stored.mfaSecret, undefined);
  assert.strictEqual(await userFromToken(beforeDisable), null);
  assert.strictEqual((await mfaCall(mfaDisable, { password: "Password1", code: newRecovery[1] })).code, 409);

  // admin features need two-factor authentication; other roles don't
  const gate = (user, ...roles) => {
    let passed = false;
    const response = fakeRes();
    requireRole(...roles)({ user }, response, () => { passed = true; });
    return { passed, code: response.code, error: response.body?.error };
  };
  assert.ok(gate({ role: "admin", mfaEnabled: true }, "admin").passed);
  const blocked = gate({ role: "admin", mfaEnabled: false }, "admin");
  assert.strictEqual(blocked.code, 403);
  assert.match(blocked.error, /two-factor/);
  assert.strictEqual(gate({ role: "admin", mfaEnabled: false }, "freelancer", "admin").code, 403);
  assert.ok(gate({ role: "client", mfaEnabled: false }, "client").passed);
  assert.match(gate({ role: "client", mfaEnabled: true }, "admin").error, /Insufficient/);
  assert.ok(isAdminWithMfa({ role: "admin", mfaEnabled: true }));
  assert.ok(!isAdminWithMfa({ role: "admin" }));
  assert.ok(!isAdminWithMfa({ role: "client", mfaEnabled: true }));

  // an admin without it can't read other people's bookings through the shared route
  require("../models/Booking").findById = () => ({ populate: async () => ({ client: "c", freelancer: "f" }) });
  out = fakeRes();
  await getBooking(
    { params: { id: "b" }, user: { id: "x", role: "admin", mfaEnabled: false } },
    { status(code) { out.code = code; return this; }, json() { return this; } },
    assert.fail
  );
  assert.strictEqual(out.code, 404);

  // breached password check, against a fake Have I Been Pwned
  const sha1 = crypto.createHash("sha1").update("Breached123").digest("hex").toUpperCase();
  const breachCheck = async (fakeFetch, body = { password: "Breached123" }) => {
    global.fetch = fakeFetch;
    const response = fakeRes();
    let passed = false;
    await rejectBreachedPassword({ body, headers: {} }, response, () => { passed = true; });
    return { passed, code: response.code };
  };
  const hibp = (text) => async (url) => {
    assert.ok(url.endsWith(`/range/${sha1.slice(0, 5)}`)); // only the prefix is sent
    return { ok: true, text: async () => text };
  };
  assert.deepStrictEqual(await breachCheck(hibp(`AAA:5\r\n${sha1.slice(5)}:3\r\nBBB:1`)), { passed: false, code: 400 });
  assert.deepStrictEqual(await breachCheck(hibp("AAA:5\r\nBBB:1")), { passed: true, code: undefined });
  // a padding entry (count 0) isn't a breach
  assert.deepStrictEqual(await breachCheck(hibp(`${sha1.slice(5)}:0`)), { passed: true, code: undefined });
  // change-password requests are checked on newPassword
  assert.deepStrictEqual(
    await breachCheck(hibp(`${sha1.slice(5)}:3`), { currentPassword: "Whatever1", newPassword: "Breached123" }),
    { passed: false, code: 400 }
  );
  // service down or erroring: allowed through
  assert.strictEqual((await breachCheck(async () => { throw new Error("offline"); })).passed, true);
  assert.strictEqual((await breachCheck(async () => ({ ok: false, status: 503 }))).passed, true);

  console.log("auth.check.js passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
