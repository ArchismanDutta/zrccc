// models/Invoice.js
const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  serviceType: { type: String, default: "" },
  quantity:    { type: Number, default: 1 },
  unitPrice:   { type: Number, required: true },
  amount:      { type: Number, required: true },
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
  invoiceId:     { type: String, unique: true },                            // ZRC-INV-00001
  invoiceNumber: { type: String, unique: true },                            // INV-2026-001
  clientId:      { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  projectId:     { type: mongoose.Schema.Types.ObjectId, ref: "Project" },

  month: { type: Number, min: 1, max: 12 },
  year:  { type: Number },

  lineItems:  [lineItemSchema],
  subtotal:   { type: Number, default: 0 },
  taxRate:    { type: Number, default: 18 },   // GST %
  taxAmount:  { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paidAmount:  { type: Number, default: 0 },

  status: {
    type: String,
    enum: ["draft", "sent", "partial", "paid", "overdue", "cancelled"],
    default: "draft",
  },

  dueDate:      { type: Date },
  currency:     { type: String, enum: ["INR", "USD", "AED", "GBP"], default: "INR" },
  notes:        { type: String, default: "" },
  paymentTerms: { type: String, default: "Net 15" },

  sentAt:    { type: Date },
  paidAt:    { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastReminderSentAt: { type: Date, default: null },
}, { timestamps: true });

// Virtual: pendingAmount
invoiceSchema.virtual("pendingAmount").get(function () {
  return Math.max(0, this.totalAmount - this.paidAmount);
});

invoiceSchema.set("toJSON", { virtuals: true });
invoiceSchema.set("toObject", { virtuals: true });

// Pre-save: auto-calculate subtotal, tax, total
invoiceSchema.pre("save", function (next) {
  if (this.lineItems && this.lineItems.length > 0) {
    this.subtotal = this.lineItems.reduce((s, item) => s + item.amount, 0);
    this.taxAmount = Math.round(this.subtotal * (this.taxRate / 100));
    this.totalAmount = this.subtotal + this.taxAmount;
  }
  next();
});

// Indexes
invoiceSchema.index({ clientId: 1, status: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ year: 1, month: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
