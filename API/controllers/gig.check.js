// Run: node controllers/gig.check.js
const assert = require("node:assert");
const mongoose = require("mongoose");
const { isOwner, canDelete } = require("./gigController");
const { validateGig } = require("../middleware/validators");

const owner = new mongoose.Types.ObjectId();
const gig = { freelancer: owner };
const ownerUser = { id: String(owner), role: "freelancer" };
const otherFreelancer = { id: String(new mongoose.Types.ObjectId()), role: "freelancer" };
const admin = { id: String(new mongoose.Types.ObjectId()), role: "admin" };

// ownership: owner only for edit, owner or admin for delete
assert.ok(isOwner(gig, ownerUser));
assert.ok(isOwner({ freelancer: { _id: owner, name: "x" } }, ownerUser)); // populated
assert.ok(!isOwner(gig, otherFreelancer));
assert.ok(!isOwner(gig, admin));
assert.ok(canDelete(gig, admin));
assert.ok(!canDelete(gig, otherFreelancer));

// runs a validator and reports { status, body } or "next"
function run(mw, body) {
  let out = "next";
  const res = { status: (s) => ({ json: (j) => (out = { status: s, body: j }) }) };
  const req = { body };
  mw(req, res, () => {});
  return out === "next" ? { next: true, body: req.body } : out;
}

const good = {
  title: "I will build a site",
  description: "A long enough description of the gig.",
  category: "Design",
  price: 500,
  deliveryDays: 3,
};

// valid create passes; injected owner is stripped
const ok = run(validateGig(false), { ...good, freelancer: "attacker" });
assert.ok(ok.next);
assert.strictEqual(ok.body.freelancer, undefined);

// create rejects missing / wrong-typed / out-of-range fields
assert.strictEqual(run(validateGig(false), { ...good, title: undefined }).status, 400);
assert.strictEqual(run(validateGig(false), { ...good, price: "500" }).status, 400);
assert.strictEqual(run(validateGig(false), { ...good, price: { $gt: 0 } }).status, 400);
assert.strictEqual(run(validateGig(false), { ...good, category: "Hacking" }).status, 400);
assert.strictEqual(run(validateGig(false), { ...good, deliveryDays: 2.5 }).status, 400);

// partial update: pause only is fine, empty body is not
assert.deepStrictEqual(run(validateGig(true), { active: false }).body, { active: false });
assert.strictEqual(run(validateGig(true), { freelancer: "attacker" }).status, 400);

console.log("gig.check.js passed");
