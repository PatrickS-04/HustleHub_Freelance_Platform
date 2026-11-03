const crypto = require("crypto");
const qrcode = require("qrcode-generator");

const STEP_SECONDS = 30;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes) {
  const bits = [...bytes].map((b) => b.toString(2).padStart(8, "0")).join("");
  const chunks = bits.match(/.{1,5}/g);
  return chunks.map((c) => BASE32[parseInt(c.padEnd(5, "0"), 2)]).join("");
}

function base32Decode(text) {
  const bits = [...text].map((c) => BASE32.indexOf(c).toString(2).padStart(5, "0")).join("");
  const chunks = bits.match(/.{8}/g);
  return Buffer.from(chunks.map((c) => parseInt(c, 2)));
}

const generateTotpSecret = () => base32Encode(crypto.randomBytes(20));

// RFC 4226. SHA-1 is what RFC 6238 defaults to and the only algorithm every
// authenticator app supports. HMAC-SHA-1 is not affected by SHA-1's collision attacks.
function hotp(secret, counter) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac("sha1", base32Decode(secret)).update(message).digest(); // NOSONAR // nosemgrep
  const offset = mac[mac.length - 1] & 0xf;
  const value = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, "0");
}

// The time step a code belongs to, or null if it doesn't match. One step either
// side is allowed for clock drift. The step is returned so that the caller can
// refuse to accept the same code twice.
function matchTotp(secret, code, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 1000 / STEP_SECONDS);
  for (const step of [current - 1, current, current + 1]) {
    if (crypto.timingSafeEqual(Buffer.from(hotp(secret, step)), Buffer.from(code))) return step;
  }
  return null;
}

const totpUri = (secret, email) => {
  const issuer = "HustleHub+";
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
};

// A data: URL, which the frontend's CSP allows for images.
function qrDataUrl(text) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createDataURL(5);
}

// Secrets are encrypted so that a database leak alone doesn't give away codes.
// Limitation: the key comes from JWT_SECRET, so rotating that disables MFA for everyone; use a dedicated key if it ever needs rotating.
const secretKey = () =>
  Buffer.from(crypto.hkdfSync("sha256", process.env.JWT_SECRET, "", "hustlehub-mfa-secret", 32));

function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(".");
}

function decryptSecret(stored) {
  const [iv, tag, encrypted] = stored.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey(), iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// Random enough that a fast hash is fine, unlike passwords. Dashes and case are
// ignored when one is entered.
const generateRecoveryCodes = () =>
  Array.from({ length: 8 }, () => crypto.randomBytes(5).toString("hex").replace(/^(.{5})/, "$1-"));

const hashRecoveryCode = (code) =>
  crypto.createHash("sha256").update(code.replace(/-/g, "").toLowerCase()).digest("hex");

module.exports = {
  generateTotpSecret,
  matchTotp,
  hotp,
  totpUri,
  qrDataUrl,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
};
