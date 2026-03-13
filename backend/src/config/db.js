const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/training_bank";
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = connectDB;
