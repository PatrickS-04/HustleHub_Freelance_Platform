const express = require("express");
const { listUsers, getUser, deleteUser } = require("../controllers/userController");
const { validateId } = require("../middleware/validators");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.param("id", validateId);
// User management is admin-only, for every route below.
router.use(requireAuth, requireRole("admin"));

router.get("/", listUsers);
router.get("/:id", getUser);
router.delete("/:id", deleteUser);

module.exports = router;
