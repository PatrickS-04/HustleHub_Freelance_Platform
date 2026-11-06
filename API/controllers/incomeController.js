const Transaction = require("../models/Transaction");

// Same rule as countsAsIncome in the frontend: Pending bookings haven't been
// agreed yet, and Declined/Cancelled ones were refunded.
const EARNING = ["Accepted", "Completed"];

// SARS individual rates for 1 March 2026 - 28 February 2027:
// https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/
// ponytail: one table, so later tax years reuse these rates (the response and
// screen name them); replace the table when SARS publishes new ones.
const SARS_RATES = {
  year: "2026/27",
  primaryRebate: 17820,
  threshold: 99000, // income where 18% of it equals the rebate, so no tax is due below it
  brackets: [
    { upTo: 245100, rate: 0.18 },
    { upTo: 383100, rate: 0.26 },
    { upTo: 530200, rate: 0.31 },
    { upTo: 695800, rate: 0.36 },
    { upTo: 887000, rate: 0.39 },
    { upTo: 1878600, rate: 0.41 },
    { upTo: Infinity, rate: 0.45 },
  ],
};

const cents = (n) => Math.round(n * 100) / 100;

// The SA tax year runs March to February, so January 2027 is in "2026/27".
function taxYearOf(date) {
  const start = date.getUTCMonth() >= 2 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return `${start}/${String(start + 1).slice(2)}`;
}

// Progressive tax on one tax year's income, with each step returned so the
// screen can show how the figure was reached. Each rate only applies to the part
// of the income inside its bracket, then the primary rebate comes off the result.
// Not tax advice: it treats booking income as taxable income, so it ignores
// deductible expenses, other income and the extra rebates from age 65.
function estimateTax(income) {
  const bands = [];
  let from = 0;
  for (const { upTo, rate } of SARS_RATES.brackets) {
    if (income <= from) break;
    const amount = Math.min(income, upTo) - from;
    bands.push({ income: cents(amount), rate, tax: cents(amount * rate) });
    from = upTo;
  }

  // Added from the rounded bands so the breakdown on screen adds up exactly.
  const beforeRebate = cents(bands.reduce((s, b) => s + b.tax, 0));
  const rebate = Math.min(beforeRebate, SARS_RATES.primaryRebate); // can't go below zero
  const estimated = cents(beforeRebate - rebate);

  return {
    ratesYear: SARS_RATES.year,
    threshold: SARS_RATES.threshold,
    income,
    bands,
    beforeRebate,
    rebate,
    estimated,
    // Effective: share of all income that goes to tax. Marginal: tax on the next rand.
    effectiveRate: income > 0 ? Math.round((estimated / income) * 10000) / 10000 : 0,
    marginalRate: estimated > 0 ? bands[bands.length - 1].rate : 0,
  };
}

// Pure summary of a freelancer's income rows, kept separate so it can be checked
// without a database. Each row: { reference, amount, status, gigId, gigTitle, clientName, date }.
function summarise(rows, now = new Date()) {
  const earning = rows.filter((r) => EARNING.includes(r.status));
  const total = earning.reduce((s, r) => s + r.amount, 0);
  const paidOut = earning.filter((r) => r.status === "Completed").reduce((s, r) => s + r.amount, 0);
  const taxYear = taxYearOf(now);

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
    // Brackets apply per tax year, so only this year's earning income
    // (Accepted + Completed, by booking date) counts, unlike the all-time total.
    tax: {
      taxYear,
      ...estimateTax(cents(earning.filter((r) => taxYearOf(new Date(r.date)) === taxYear).reduce((s, r) => s + r.amount, 0))),
    },
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
    // Summarised in JS, which is fine for one freelancer's bookings; an aggregation pipeline would suit larger volumes.
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

module.exports = { myIncome, summarise, estimateTax, taxYearOf };
