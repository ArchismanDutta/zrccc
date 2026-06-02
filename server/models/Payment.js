// models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true },                                // ZRC-PAY-00001
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true },
  clientId:  { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },

  amount:        { type: Number, required: true },
  currency:      { type: String, enum: ["INR", "USD", "AED", "GBP"], default: "INR" },
  paymentDate:   { type: Date, required: true },
  paymentMethod: {
    type: String,
    enum: ["bank_transfer", "upi", "cash", "cheque", "card", "other"],
    default: "bank_transfer",
  },
  transactionRef: { type: String, default: "" },
  notes:          { type: String, default: "" },
  receiptUrl:     { type: String, default: "" },

  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// Indexes
paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ clientId: 1, paymentDate: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
