const express = require("express");
const { myIncome } = require("../controllers/incomeController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, requireRole("freelancer"), myIncome);

module.exports = router;
