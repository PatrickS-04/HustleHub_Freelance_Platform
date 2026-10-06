const mongoose = require("mongoose");

// Pending -> Accepted -> Completed, with Declined (freelancer) and Cancelled
// (client) as the exits. Mirrors STATUS_ACTIONS in the frontend.
const STATUSES = ["Pending", "Accepted", "Completed", "Declined", "Cancelled"];

const bookingSchema = new mongoose.Schema(
  {
    gig: { type: mongoose.Schema.Types.ObjectId, ref: "Gig", required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Snapshot at booking time so a later gig edit/delete can't change what was agreed.
    gigTitle: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    status: { type: String, enum: STATUSES, default: "Pending" },
    review: {
      rating: { type: Number, min: 1, max: 5 },
      text: { type: String, trim: true, maxlength: 500 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
module.exports.STATUSES = STATUSES;
