// models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true, index: true },
  senderId:  { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  body:      { type: String, required: true, maxlength: 4000 },
  readBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

messageSchema.index({ channelId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
