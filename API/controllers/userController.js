const User = require("../models/User");
const Gig = require("../models/Gig");
const Booking = require("../models/Booking");
const Transaction = require("../models/Transaction");

// Never includes the password hash (it is `select: false` on the model).
const toUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  createdAt: u.createdAt,
});

// Admin only (see userRoutes): every account, newest first.
async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users: users.map(toUser) });
  } catch (err) {
    next(err);
  }
}

// One account plus how much it has done on the platform.
async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const [gigs, bookingsMade, bookingsReceived] = await Promise.all([
      Gig.countDocuments({ freelancer: user._id }),
      Booking.countDocuments({ client: user._id }),
      Booking.countDocuments({ freelancer: user._id }),
    ]);
    res.json({ user: { ...toUser(user), gigs, bookingsMade, bookingsReceived } });
  } catch (err) {
    next(err);
  }
}

// Removes the account and everything that hangs off it, so no gig, booking or
// transaction is left pointing at a user that no longer exists.
// Sequential deletes: Mongo multi-document transactions need a replica set; switch to a session if one is used
async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const bookings = await Booking.find({ $or: [{ client: user._id }, { freelancer: user._id }] }, "_id");
    await Transaction.deleteMany({ booking: { $in: bookings.map((b) => b._id) } });
    await Booking.deleteMany({ _id: { $in: bookings.map((b) => b._id) } });
    await Gig.deleteMany({ freelancer: user._id });
    await user.deleteOne();

    res.json({ message: "User deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, getUser, deleteUser, toUser };
