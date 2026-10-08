// Run: node middleware/sanitize.check.js
const assert = require("node:assert");
const { stripHtml, sanitizeInput, noSqlInjection } = require("./sanitize");

// markup is removed, scripts and styles with their contents
assert.strictEqual(stripHtml("Logo <script>alert(1)</script>design"), "Logo design");
assert.strictEqual(stripHtml("<b>Bold</b> title"), "Bold title");
assert.strictEqual(stripHtml('<img src=x onerror="alert(1)">Nice'), "Nice");
assert.strictEqual(stripHtml("<style>body{display:none}</style>ok"), "ok");
assert.strictEqual(stripHtml('<a href="javascript:alert(1)">x</a>'), "x");
assert.strictEqual(stripHtml("<!-- hidden -->shown"), "shown");
// nesting can't reassemble a tag: removing the inner block leaves "<script>",
// which the next pass removes too
assert.strictEqual(stripHtml("<scr<script>x</script>ipt>alert(1)"), "alert(1)");
// a leftover "<scr" has no ">" so it can never become a tag
assert.strictEqual(stripHtml("<scr<script>ipt>alert(1)</script>"), "<scr");

// ordinary text with < and > is kept
assert.strictEqual(stripHtml("Delivered in <3 days, guaranteed"), "Delivered in <3 days, guaranteed");
assert.strictEqual(stripHtml("x < y and y > z"), "x < y and y > z");
assert.strictEqual(stripHtml("Tom & Jerry \"quotes\" it's"), "Tom & Jerry \"quotes\" it's");

// only the named string fields are cleaned
const req = { body: { title: "<i>Hi</i> there", price: 100, other: "<b>x</b>" } };
sanitizeInput(["title", "price", "missing"])(req, {}, () => {});
assert.deepStrictEqual(req.body, { title: "Hi there", price: 100, other: "<b>x</b>" });

// $-operators are stripped from the body (NoSQL injection)
const login = { body: { email: { $ne: "" }, password: "x" }, query: {}, params: {}, headers: {} };
noSqlInjection(login, {}, () => {});
assert.deepStrictEqual(login.body.email, {});

console.log("sanitize.check.js passed");
