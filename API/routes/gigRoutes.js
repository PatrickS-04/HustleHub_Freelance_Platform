const express = require("express");
const { listGigs, myGigs, getGig, createGig, updateGig, deleteGig } = require("../controllers/gigController");
const { validateGig, validateId } = require("../middleware/validators");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sanitizeInput } = require("../middleware/sanitize");

const router = express.Router();

router.param("id", validateId);
const cleanGig = sanitizeInput(["title", "description"]);
router.use(requireAuth);

router.get("/", listGigs);
router.get("/mine", requireRole("freelancer"), myGigs);
router.get("/:id", getGig);
router.post("/", requireRole("freelancer"), cleanGig, validateGig(false), createGig);
router.patch("/:id", requireRole("freelancer"), cleanGig, validateGig(true), updateGig);
router.delete("/:id", requireRole("freelancer", "admin"), deleteGig);

module.exports = router;
