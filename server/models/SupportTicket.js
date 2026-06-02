// models/SupportTicket.js
const mongoose = require("mongoose");
const { nextSequence } = require("./Counter");

const replySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const supportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true },                                  // ZRC-TKT-00001
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true },

  status: {
    type: String,
    enum: ["open", "in_progress", "resolved"],
    default: "open",
  },

  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  replies:    [replySchema],
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

// Auto-generate ticketId
supportTicketSchema.pre("save", async function (next) {
  if (!this.ticketId) {
    const seq = await nextSequence("ticket");
    this.ticketId = `ZRC-TKT-${String(seq).padStart(5, "0")}`;
  }
  next();
});

// Indexes
supportTicketSchema.index({ clientId: 1, status: 1 });
supportTicketSchema.index({ raisedBy: 1 });
supportTicketSchema.index({ status: 1, priority: 1 });
supportTicketSchema.index({ assignedTo: 1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
