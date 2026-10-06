// Run: node controllers/booking.check.js
const assert = require("node:assert");
const mongoose = require("mongoose");
const { canTransition, partyRole } = require("./bookingController");
const { validateBooking, validateStatus, validateReview } = require("../middleware/validators");

// status flow per role
assert.ok(canTransition("freelancer", "Pending", "Accepted"));
assert.ok(canTransition("freelancer", "Pending", "Declined"));
assert.ok(canTransition("freelancer", "Accepted", "Completed"));
assert.ok(canTransition("client", "Pending", "Cancelled"));
assert.ok(!canTransition("client", "Pending", "Accepted")); // client can't accept own booking
assert.ok(!canTransition("freelancer", "Pending", "Completed")); // no skipping
assert.ok(!canTransition("client", "Accepted", "Cancelled"));
assert.ok(!canTransition("freelancer", "Completed", "Pending"));
assert.ok(!canTransition("admin", "Pending", "Accepted"));

// only the two parties of a booking get a role on it
const c = new mongoose.Types.ObjectId(), f = new mongoose.Types.ObjectId();
const booking = { client: { _id: c, name: "C" }, freelancer: f };
assert.strictEqual(partyRole(booking, { id: String(c) }), "client");
assert.strictEqual(partyRole(booking, { id: String(f) }), "freelancer");
assert.strictEqual(partyRole(booking, { id: String(new mongoose.Types.ObjectId()) }), null);

function run(mw, body) {
  let out = "next";
  const res = { status: (s) => ({ json: (j) => (out = { status: s, body: j }) }) };
  const req = { body };
  mw(req, res, () => {});
  return out === "next" ? { next: true, body: req.body } : out;
}

const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const gigId = String(new mongoose.Types.ObjectId());

// valid booking passes; price/client injected in the body are dropped
const ok = run(validateBooking, { gigId, date: day(3), note: " hi ", price: 1, client: "x" });
assert.deepStrictEqual(ok.body, { gigId, date: day(3), note: "hi" });
assert.strictEqual(run(validateBooking, { gigId: { $ne: null }, date: day(3) }).status, 400);
assert.strictEqual(run(validateBooking, { gigId, date: day(-5) }).status, 400);
assert.strictEqual(run(validateBooking, { gigId, date: day(400) }).status, 400);
assert.strictEqual(run(validateBooking, { gigId, date: "2026-02-30" }).status, 400);
assert.strictEqual(run(validateBooking, { gigId, date: day(3), note: "x".repeat(301) }).status, 400);

assert.ok(run(validateStatus, { status: "Accepted" }).next);
assert.strictEqual(run(validateStatus, { status: "Pending" }).status, 400);
assert.strictEqual(run(validateStatus, { status: { $ne: "x" } }).status, 400);

assert.deepStrictEqual(run(validateReview, { rating: 5 }).body, { rating: 5, text: "" });
assert.strictEqual(run(validateReview, { rating: 6 }).status, 400);
assert.strictEqual(run(validateReview, { rating: 4.5 }).status, 400);

console.log("booking.check.js passed");
