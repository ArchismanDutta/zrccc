// models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true },                                // ZRC-PAY-00001
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true },
  clientId:  { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },

  amount:        { type: Number, required: true, min: [0.01, "Payment amount must be greater than zero"] },
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

  // TDS (Tax Deducted at Source) — common in Indian B2B payments
  tdsRate:           { type: Number, default: 0, min: [0, "TDS rate cannot be negative"], max: [100, "TDS rate cannot exceed 100%"] },
  tdsAmount:         { type: Number, default: 0, min: [0, "TDS amount cannot be negative"] },
  netAmountReceived: { type: Number, default: 0, min: [0, "Net amount cannot be negative"] },

  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// Indexes
paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ clientId: 1, paymentDate: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
