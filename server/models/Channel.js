// models/Channel.js
const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
  type:         { type: String, enum: ["direct", "project"], required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
  name:         { type: String, default: "" },
  lastMessage:  { type: String, default: "" },
  lastAt:       { type: Date, default: null },
}, { timestamps: true });

channelSchema.index({ participants: 1 });
channelSchema.index({ projectId: 1 });

module.exports = mongoose.model("Channel", channelSchema);
