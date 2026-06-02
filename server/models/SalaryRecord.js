// models/SalaryRecord.js
const mongoose = require("mongoose");
const { nextSequence } = require("./Counter");

const salaryRecordSchema = new mongoose.Schema({
  salaryId:   { type: String, unique: true },                                // ZRC-SAL-00001
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  month: { type: Number, required: true, min: 1, max: 12 },
  year:  { type: Number, required: true },

  baseSalary:  { type: Number, required: true },
  bonus:       { type: Number, default: 0 },
  deductions: [{
    description: { type: String, required: true },
    amount:      { type: Number, required: true, min: 0 },
  }],
  netSalary:   { type: Number, default: 0 },  // auto-calc: baseSalary + bonus - sum(deductions)

  status: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },

  paidDate:       { type: Date, default: null },
  paymentMethod:  {
    type: String,
    enum: ["bank_transfer", "upi", "cash", "cheque"],
    default: null,
  },
  transactionRef: { type: String, default: "" },
  payslipUrl:     { type: String, default: "" },
  notes:          { type: String, default: "" },

  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

// Auto-generate salaryId + calculate netSalary
salaryRecordSchema.pre("save", async function (next) {
  // Auto-generate salaryId
  if (!this.salaryId) {
    const seq = await nextSequence("salary");
    this.salaryId = `ZRC-SAL-${String(seq).padStart(5, "0")}`;
  }

  // Auto-calculate netSalary
  const totalDeductions = (this.deductions || []).reduce((s, d) => s + (d.amount || 0), 0);
  this.netSalary = (this.baseSalary || 0) + (this.bonus || 0) - totalDeductions;

  next();
});

// Compound unique index — one record per employee per month
salaryRecordSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
salaryRecordSchema.index({ status: 1 });
salaryRecordSchema.index({ year: -1, month: -1 });

module.exports = mongoose.model("SalaryRecord", salaryRecordSchema);
