const crypto = require("crypto");
const mongoose = require("mongoose");

// One per booking, created when the booking is made (payment is simulated).
// Income = sum of a freelancer's transactions whose booking is Accepted/Completed.
const transactionSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      unique: true,
      default: () => `TX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["Simulated", "Refunded"], default: "Simulated" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
