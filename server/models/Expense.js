// models/Expense.js
const mongoose = require("mongoose");
const { nextSequence } = require("./Counter");

const expenseSchema = new mongoose.Schema({
  expenseId: { type: String, unique: true },                                 // ZRC-EXP-00001

  category: {
    type: String,
    required: true,
    enum: [
      "rent", "utilities", "software_tools", "freelancer",
      "equipment", "office_supplies", "marketing", "travel", "misc",
    ],
  },

  description: { type: String, required: true, trim: true },
  amount:      { type: Number, required: true, min: 0 },
  currency:    { type: String, default: "INR" },
  date:        { type: Date, required: true },
  vendor:      { type: String, default: "", trim: true },
  recurring:   { type: Boolean, default: false },

  paidBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  notes: { type: String, default: "" },
}, { timestamps: true });

// Auto-generate expenseId
expenseSchema.pre("save", async function (next) {
  if (!this.expenseId) {
    const seq = await nextSequence("expense");
    this.expenseId = `ZRC-EXP-${String(seq).padStart(5, "0")}`;
  }
  next();
});

// Indexes
expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
