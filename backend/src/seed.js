/**
 * Seed script — creates a demo coach user.
 * Run: npm run seed
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");

async function seed() {
  await connectDB();

  // Ensure a demo coach user exists
  const demoEmail = "coach@example.com";
  const existing = await User.findOne({ email: demoEmail });
  if (!existing) {
    await User.create({
      name: "Demo Coach",
      email: demoEmail,
      password: "coach123",
      role: "coach",
      sports: ["football"],
    });
    console.log("Demo user created: coach@example.com / coach123");
  } else {
    console.log("Demo user already exists");
  }

  await mongoose.disconnect();
  console.log("Seed complete");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
