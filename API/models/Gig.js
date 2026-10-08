const mongoose = require("mongoose");

const CATEGORIES = [
  "Design",
  "Web Development",
  "Writing",
  "Marketing",
  "Photography",
  "Video",
  "Translation",
];

const gigSchema = new mongoose.Schema(
  {
    // Limits match the MyGigs form validation in the frontend.
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 80 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 500 },
    category: { type: String, required: true, enum: CATEGORIES },
    price: { type: Number, required: true, min: 50, max: 100000 },
    deliveryDays: { type: Number, required: true, min: 1, max: 60 },
    // Paused gigs are hidden from browsing but kept for their owner.
    active: { type: Boolean, default: true },
    // Owner - every update/delete is checked against this.
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Gig", gigSchema);
module.exports.CATEGORIES = CATEGORIES;
