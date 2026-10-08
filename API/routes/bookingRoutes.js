const express = require("express");
const {
  createBooking,
  myBookings,
  allBookings,
  getBooking,
  updateStatus,
  addReview,
} = require("../controllers/bookingController");
const { validateBooking, validateStatus, validateReview, validateId } = require("../middleware/validators");
const { requireAuth, requireRole } = require("../middleware/auth");
const { bookingLimiter } = require("../middleware/rateLimiters");
const { sanitizeInput } = require("../middleware/sanitize");

const router = express.Router();

router.param("id", validateId);
router.use(requireAuth);

router.post("/", requireRole("client"), bookingLimiter, sanitizeInput(["note"]), validateBooking, createBooking);
router.get("/", requireRole("admin"), allBookings);
router.get("/mine", requireRole("client", "freelancer"), myBookings);
router.get("/:id", getBooking);
// Which transition is allowed is decided per booking in the controller.
router.patch("/:id/status", requireRole("client", "freelancer"), validateStatus, updateStatus);
router.post("/:id/review", requireRole("client"), sanitizeInput(["text"]), validateReview, addReview);

module.exports = router;
