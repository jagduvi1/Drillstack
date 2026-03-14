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

  // Ensure demo users exist
  const users = [
    { name: "Demo Coach", email: "coach@example.com", password: "coach123", role: "coach", sports: ["football"] },
    { name: "Test Coach", email: "test@example.com", password: "test1234", role: "coach", sports: ["football", "handball"] },
  ];

  for (const u of users) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      await User.create(u);
      console.log(`User created: ${u.email} / ${u.password}`);
    } else {
      console.log(`User already exists: ${u.email}`);
    }
  }

  await mongoose.disconnect();
  console.log("Seed complete");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
