// Run: node controllers/income.check.js
const assert = require("node:assert");
const { summarise, estimateTax, taxYearOf } = require("./incomeController");

const NOW = new Date("2026-11-03");

const row = (status, amount, gigId, date) => ({
  reference: `TX-${status}`,
  amount,
  status,
  gigId,
  gigTitle: `Gig ${gigId}`,
  clientName: "C",
  date,
});

const s = summarise([
  row("Completed", 500, "a", "2026-09-10"),
  row("Accepted", 300, "a", "2026-10-02"),
  row("Accepted", 200, "b", "2026-10-20"),
  row("Pending", 999, "a", "2026-10-05"), // not agreed yet
], NOW);

assert.strictEqual(s.total, 1000);
assert.strictEqual(s.paidOut, 500);
assert.strictEqual(s.inProgress, 500);
// R1000 is below the threshold: 18% is R180, and the rebate cancels it.
assert.strictEqual(s.tax.taxYear, "2026/27");
assert.strictEqual(s.tax.income, 1000);
assert.strictEqual(s.tax.beforeRebate, 180);
assert.strictEqual(s.tax.rebate, 180);
assert.strictEqual(s.tax.estimated, 0);
assert.deepStrictEqual(s.byMonth, [
  { month: "2026-09", count: 1, total: 500 },
  { month: "2026-10", count: 2, total: 500 },
]);
assert.deepStrictEqual(s.byGig.map((g) => [g.gigId, g.count, g.total]), [["a", 2, 800], ["b", 1, 200]]);
assert.strictEqual(s.transactions.length, 3);

// no income
const none = summarise([], NOW);
assert.strictEqual(none.total, 0);
assert.deepStrictEqual(none.tax, {
  taxYear: "2026/27", ratesYear: "2026/27", threshold: 99000, income: 0, bands: [],
  beforeRebate: 0, rebate: 0, estimated: 0, effectiveRate: 0, marginalRate: 0,
});

// Every bracket's upper limit must give the base amount in the SARS table.
for (const [income, base] of [
  [245100, 44118], [383100, 79998], [530200, 125599], [695800, 185215], [887000, 259783], [1878600, 666339],
]) {
  assert.strictEqual(estimateTax(income).beforeRebate, base);
}

// Rebate: no tax at the threshold, tax just above it.
assert.strictEqual(estimateTax(99000).estimated, 0);
assert.strictEqual(estimateTax(100000).estimated, 180);
assert.strictEqual(estimateTax(100000).marginalRate, 0.18);
assert.strictEqual(estimateTax(50000).marginalRate, 0);

// Only the part above a bracket's limit pays the higher rate: 44118 + 26% of 54900 - 17820.
const mid = estimateTax(300000);
assert.strictEqual(mid.estimated, 40572);
assert.deepStrictEqual(mid.bands, [
  { income: 245100, rate: 0.18, tax: 44118 },
  { income: 54900, rate: 0.26, tax: 14274 },
]);
assert.strictEqual(mid.effectiveRate, 0.1352);
assert.strictEqual(mid.marginalRate, 0.26);

// Top bracket has no upper limit: 666339 + 45% of 121400 - 17820.
assert.strictEqual(estimateTax(2000000).estimated, 703149);
assert.strictEqual(estimateTax(2000000).marginalRate, 0.45);

// Cents are rounded.
assert.strictEqual(estimateTax(100000.33).estimated, 180.06);

// Tax year runs March to February.
assert.strictEqual(taxYearOf(new Date("2026-02-28")), "2025/26");
assert.strictEqual(taxYearOf(new Date("2026-03-01")), "2026/27");
assert.strictEqual(taxYearOf(new Date("2027-02-28")), "2026/27");
assert.strictEqual(taxYearOf(new Date("2027-03-01")), "2027/28");

// Other tax years count towards total income but not this year's tax.
const years = summarise([
  row("Completed", 100, "a", "2026-02-28"), // last year
  row("Completed", 200, "a", "2026-03-01"),
  row("Accepted", 400, "a", "2027-02-28"),
  row("Accepted", 800, "a", "2027-03-01"), // next year
], NOW);
assert.strictEqual(years.total, 1500);
assert.strictEqual(years.tax.income, 600);

console.log("income.check.js passed");
