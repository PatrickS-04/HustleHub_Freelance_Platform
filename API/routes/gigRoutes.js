const express = require("express");
const { listGigs, myGigs, getGig, createGig, updateGig, deleteGig } = require("../controllers/gigController");
const { validateGig, validateId } = require("../middleware/validators");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.param("id", validateId);
router.use(requireAuth);

router.get("/", listGigs);
router.get("/mine", requireRole("freelancer"), myGigs);
router.get("/:id", getGig);
router.post("/", requireRole("freelancer"), validateGig(false), createGig);
router.patch("/:id", requireRole("freelancer"), validateGig(true), updateGig);
router.delete("/:id", requireRole("freelancer", "admin"), deleteGig);

module.exports = router;
