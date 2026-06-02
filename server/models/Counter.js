// models/Counter.js
// Atomic sequence counter for generating human-readable IDs.
// Usage: const seq = await nextSequence("client");
//        const id = `ZRC-CLT-${String(seq).padStart(5, "0")}`;
const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

async function nextSequence(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
}

module.exports = { Counter, nextSequence };
