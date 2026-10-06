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
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 1000 },
    category: { type: String, required: true, enum: CATEGORIES },
    price: { type: Number, required: true, min: 50, max: 1000000 },
    deliveryDays: { type: Number, required: true, min: 1, max: 90 },
    // Owner - every update/delete is checked against this.
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Gig", gigSchema);
module.exports.CATEGORIES = CATEGORIES;
