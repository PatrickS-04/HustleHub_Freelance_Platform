const Booking = require("../models/Booking");
const Gig = require("../models/Gig");
const Transaction = require("../models/Transaction");

// Allowed status changes per role. Mirrors STATUS_ACTIONS in the frontend.
const TRANSITIONS = {
  freelancer: { Pending: ["Accepted", "Declined"], Accepted: ["Completed"] },
  client: { Pending: ["Cancelled"] },
};
const canTransition = (role, from, to) => (TRANSITIONS[role]?.[from] || []).includes(to);

// A booking belongs to its client and its freelancer; nobody else may touch it.
const partyRole = (booking, user) => {
  if (String(booking.client?._id ?? booking.client) === String(user.id)) return "client";
  if (String(booking.freelancer?._id ?? booking.freelancer) === String(user.id)) return "freelancer";
  return null;
};

const POPULATE = [
  { path: "client", select: "name" },
  { path: "freelancer", select: "name" },
];

// Shape the frontend already uses.
function toBooking(b, reference) {
  return {
    id: b.id,
    transactionId: reference,
    gigId: String(b.gig),
    gigTitle: b.gigTitle,
    price: b.price,
    clientId: String(b.client._id),
    clientName: b.client.name,
    freelancerId: String(b.freelancer._id),
    freelancerName: b.freelancer.name,
    date: b.date.toISOString().slice(0, 10),
    note: b.note,
    status: b.status,
    review: b.review?.rating ? { rating: b.review.rating, text: b.review.text, createdAt: b.review.createdAt } : undefined,
    createdAt: b.createdAt,
  };
}

// Attaches each booking's transaction reference with one extra query.
async function withReferences(bookings) {
  const txs = await Transaction.find({ booking: { $in: bookings.map((b) => b._id) } }, "booking reference");
  const refs = new Map(txs.map((t) => [String(t.booking), t.reference]));
  return bookings.map((b) => toBooking(b, refs.get(String(b._id))));
}

// Client books a live gig. Payment is simulated: the booking and its
// transaction record are created together.
async function createBooking(req, res, next) {
  try {
    const { gigId, date, note } = req.body;
    const gig = await Gig.findById(gigId);
    if (!gig || !gig.active) return res.status(404).json({ error: "Gig not found." });

    const booking = await Booking.create({
      gig: gig._id,
      client: req.user.id,
      freelancer: gig.freelancer,
      gigTitle: gig.title,
      price: gig.price, // from the database, never from the request
      date,
      note,
    });

    let tx;
    try {
      tx = await Transaction.create({
        booking: booking._id,
        client: booking.client,
        freelancer: booking.freelancer,
        amount: booking.price,
      });
    } catch (err) {
      // Manual rollback: Mongo multi-document transactions need a replica set; switch to a session if one is used
      await booking.deleteOne();
      throw err;
    }

    await booking.populate(POPULATE);
    res.status(201).json({ message: "Booking confirmed (simulated payment).", booking: toBooking(booking, tx.reference) });
  } catch (err) {
    next(err);
  }
}

// Clients see bookings they made; freelancers see bookings on their gigs.
async function myBookings(req, res, next) {
  try {
    const filter = req.user.role === "freelancer" ? { freelancer: req.user.id } : { client: req.user.id };
    const bookings = await Booking.find(filter).populate(POPULATE).sort({ createdAt: -1 });
    res.json({ bookings: await withReferences(bookings) });
  } catch (err) {
    next(err);
  }
}

// Admin oversight of every booking.
async function allBookings(req, res, next) {
  try {
    const bookings = await Booking.find().populate(POPULATE).sort({ createdAt: -1 });
    res.json({ bookings: await withReferences(bookings) });
  } catch (err) {
    next(err);
  }
}

async function getBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id).populate(POPULATE);
    // 404 rather than 403 so other users can't probe which booking ids exist.
    if (!booking || (!partyRole(booking, req.user) && req.user.role !== "admin")) {
      return res.status(404).json({ error: "Booking not found." });
    }
    const [shaped] = await withReferences([booking]);
    res.json({ booking: shaped });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id).populate(POPULATE);
    const role = booking && partyRole(booking, req.user);
    if (!role) return res.status(404).json({ error: "Booking not found." });

    const { status } = req.body;
    if (!canTransition(role, booking.status, status)) {
      return res.status(409).json({ error: `A ${role} cannot change a ${booking.status} booking to ${status}.` });
    }

    booking.status = status;
    await booking.save();
    // Simulated refund: declined/cancelled bookings no longer count as income.
    if (status === "Declined" || status === "Cancelled") {
      await Transaction.updateOne({ booking: booking._id }, { status: "Refunded" });
    }

    const [shaped] = await withReferences([booking]);
    res.json({ message: `Booking ${status.toLowerCase()}.`, booking: shaped });
  } catch (err) {
    next(err);
  }
}

// The client may review their own completed booking once.
async function addReview(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id).populate(POPULATE);
    if (!booking || partyRole(booking, req.user) !== "client") {
      return res.status(404).json({ error: "Booking not found." });
    }
    if (booking.status !== "Completed") {
      return res.status(409).json({ error: "Only completed bookings can be reviewed." });
    }
    if (booking.review?.rating) {
      return res.status(409).json({ error: "This booking has already been reviewed." });
    }

    booking.review = { ...req.body, createdAt: new Date() };
    await booking.save();
    const [shaped] = await withReferences([booking]);
    res.status(201).json({ message: "Review added.", booking: shaped });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBooking,
  myBookings,
  allBookings,
  getBooking,
  updateStatus,
  addReview,
  canTransition,
  partyRole,
};
