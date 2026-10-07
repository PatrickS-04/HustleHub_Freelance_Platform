const Transaction = require("../models/Transaction");

// Same rule as countsAsIncome in the frontend: Pending bookings haven't been
// agreed yet, and Declined/Cancelled ones were refunded.
const EARNING = ["Accepted", "Completed"];

// Pure summary of a freelancer's income rows, kept separate so it can be checked
// without a database. Each row: { reference, amount, status, gigId, gigTitle, clientName, date }.
function summarise(rows) {
  const earning = rows.filter((r) => EARNING.includes(r.status));
  const total = earning.reduce((s, r) => s + r.amount, 0);
  const paidOut = earning.filter((r) => r.status === "Completed").reduce((s, r) => s + r.amount, 0);

  const group = (keyOf, init) =>
    Object.values(
      earning.reduce((acc, r) => {
        const k = keyOf(r);
        acc[k] ||= { ...init(r), count: 0, total: 0 };
        acc[k].count += 1;
        acc[k].total += r.amount;
        return acc;
      }, {})
    );

  return {
    total,
    paidOut,
    inProgress: total - paidOut,
    // Grouped by the booking's start-date month, like the frontend chart.
    byMonth: group((r) => r.date.slice(0, 7), (r) => ({ month: r.date.slice(0, 7) })).sort((a, b) =>
      a.month.localeCompare(b.month)
    ),
    byGig: group((r) => r.gigId, (r) => ({ gigId: r.gigId, title: r.gigTitle })).sort((a, b) => b.total - a.total),
    transactions: earning,
  };
}

// The logged-in freelancer's income only - the filter comes from the JWT.
async function myIncome(req, res, next) {
  try {
    // ponytail: summarised in JS - fine for one freelancer's bookings; move to an aggregation pipeline if this grows large
    const txs = await Transaction.find({ freelancer: req.user.id, status: "Simulated" })
      .populate({ path: "booking", select: "gig gigTitle date status client", populate: { path: "client", select: "name" } })
      .sort({ createdAt: -1 });

    const rows = txs
      .filter((t) => t.booking)
      .map((t) => ({
        reference: t.reference,
        amount: t.amount,
        status: t.booking.status,
        gigId: String(t.booking.gig),
        gigTitle: t.booking.gigTitle,
        clientName: t.booking.client?.name,
        date: t.booking.date.toISOString().slice(0, 10),
      }));

    res.json(summarise(rows));
  } catch (err) {
    next(err);
  }
}

module.exports = { myIncome, summarise };
