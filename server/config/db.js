// config/db.js
const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

async function connectDB() {
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });
  console.log("✅ MongoDB connected:", mongoose.connection.host);
}

module.exports = connectDB;
