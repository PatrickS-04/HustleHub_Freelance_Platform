const Gig = require("../models/Gig");
const { logger, requestContext } = require("../utils/logger");

// Owners manage their own gigs; admins may remove any gig (moderation).
const isOwner = (gig, user) => String(gig.freelancer?._id ?? gig.freelancer) === String(user.id);
const canDelete = (gig, user) => user.role === "admin" || isOwner(gig, user);

// Shape the frontend already uses (id, freelancerId, freelancerName).
function toGig(gig) {
  const f = gig.freelancer;
  return {
    id: gig.id,
    title: gig.title,
    description: gig.description,
    category: gig.category,
    price: gig.price,
    deliveryDays: gig.deliveryDays,
    active: gig.active,
    freelancerId: String(f?._id ?? f),
    freelancerName: f?.name,
    createdAt: gig.createdAt,
  };
}

// Any signed-in user browses live gigs.
async function listGigs(req, res, next) {
  try {
    const gigs = await Gig.find({ active: true }).populate("freelancer", "name").sort({ createdAt: -1 });
    res.json({ gigs: gigs.map(toGig) });
  } catch (err) {
    next(err);
  }
}

// A freelancer's own gigs, paused ones included.
async function myGigs(req, res, next) {
  try {
    const gigs = await Gig.find({ freelancer: req.user.id }).populate("freelancer", "name").sort({ createdAt: -1 });
    res.json({ gigs: gigs.map(toGig) });
  } catch (err) {
    next(err);
  }
}

async function getGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id).populate("freelancer", "name");
    // Paused gigs are only visible to their owner.
    if (!gig || (!gig.active && !isOwner(gig, req.user))) {
      return res.status(404).json({ error: "Gig not found." });
    }
    res.json({ gig: toGig(gig) });
  } catch (err) {
    next(err);
  }
}

async function createGig(req, res, next) {
  try {
    // Owner comes from the verified JWT, never from the request body.
    const gig = await Gig.create({ ...req.body, freelancer: req.user.id });
    await gig.populate("freelancer", "name");
    res.status(201).json({ message: "Gig created.", gig: toGig(gig) });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: "Invalid gig data." });
    next(err);
  }
}

async function updateGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ error: "Gig not found." });
    if (!isOwner(gig, req.user)) return res.status(403).json({ error: "You can only edit your own gigs." });

    gig.set(req.body);
    await gig.save();
    await gig.populate("freelancer", "name");
    res.json({ message: "Gig updated.", gig: toGig(gig) });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: "Invalid gig data." });
    next(err);
  }
}

async function deleteGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ error: "Gig not found." });
    if (!canDelete(gig, req.user)) return res.status(403).json({ error: "You can only delete your own gigs." });

    // Bookings keep their own snapshot of title/price, so history survives this.
    await gig.deleteOne();
    if (!isOwner(gig, req.user)) logger.warn("admin.gig_removed", { ...requestContext(req), gigId: gig.id });
    res.json({ message: "Gig deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = { listGigs, myGigs, getGig, createGig, updateGig, deleteGig, isOwner, canDelete };
