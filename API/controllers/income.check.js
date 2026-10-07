// Run: node controllers/income.check.js
const assert = require("node:assert");
const { summarise } = require("./incomeController");

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
]);

assert.strictEqual(s.total, 1000);
assert.strictEqual(s.paidOut, 500);
assert.strictEqual(s.inProgress, 500);
assert.deepStrictEqual(s.byMonth, [
  { month: "2026-09", count: 1, total: 500 },
  { month: "2026-10", count: 2, total: 500 },
]);
assert.deepStrictEqual(s.byGig.map((g) => [g.gigId, g.count, g.total]), [["a", 2, 800], ["b", 1, 200]]);
assert.strictEqual(s.transactions.length, 3);

// no income
assert.deepStrictEqual(summarise([]), { total: 0, paidOut: 0, inProgress: 0, byMonth: [], byGig: [], transactions: [] });

console.log("income.check.js passed");
