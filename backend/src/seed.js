/**
 * Seed script — populates the database with initial taxonomy values.
 * Run: npm run seed
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Taxonomy = require("./models/Taxonomy");
const User = require("./models/User");

const SEED_DATA = [
  // ── Individual Skills (universal) ───────────────────────────────────────
  { category: "individual_skills", name: "Passing", description: "Ability to deliver the ball accurately to a teammate" },
  { category: "individual_skills", name: "Receiving", description: "Controlling an incoming ball" },
  { category: "individual_skills", name: "Dribbling", description: "Moving with the ball under close control" },
  { category: "individual_skills", name: "Shooting", description: "Attempting to score" },
  { category: "individual_skills", name: "Tackling", description: "Winning the ball from an opponent" },
  { category: "individual_skills", name: "Heading", description: "Playing the ball with the head", sport: "football" },
  { category: "individual_skills", name: "Throwing", description: "Delivering the ball by hand", sport: "handball" },

  // ── Coordination ────────────────────────────────────────────────────────
  { category: "coordination", name: "General coordination", description: "Movement, balance, direction changes" },
  { category: "coordination", name: "Sport-specific coordination", description: "Object control, technique, movement patterns" },
  { category: "coordination", name: "Balance", description: "Maintaining body equilibrium" },
  { category: "coordination", name: "Agility", description: "Quick directional changes" },
  { category: "coordination", name: "Rhythm", description: "Timing and tempo of movements" },

  // ── Perception ──────────────────────────────────────────────────────────
  { category: "perception", name: "Body orientation", description: "How the player positions their body relative to the field" },
  { category: "perception", name: "Field of view", description: "Awareness of the visible playing area" },
  { category: "perception", name: "Spatial awareness", description: "Awareness of nearby space, teammates, and opponents" },
  { category: "perception", name: "Anticipation", description: "Reading the play before it happens" },

  // ── Roles ───────────────────────────────────────────────────────────────
  { category: "roles", name: "Ball carrier", description: "The player currently in possession" },
  { category: "roles", name: "Teammate of ball carrier", description: "Supporting the player with the ball" },
  { category: "roles", name: "Direct opponent", description: "Directly marking or challenging the ball carrier" },
  { category: "roles", name: "Indirect opponent", description: "Covering space or another player" },

  // ── Didactic Strategy ───────────────────────────────────────────────────
  { category: "didactic_strategy", name: "Possession game", description: "Ball-retention focused exercise" },
  { category: "didactic_strategy", name: "Modified game", description: "Game with adapted rules to emphasize learning" },
  { category: "didactic_strategy", name: "Repeated waves", description: "Sequential repetition of the same pattern" },
  { category: "didactic_strategy", name: "Coordination track", description: "Structured track with coordination stations" },
  { category: "didactic_strategy", name: "Small-sided game", description: "Reduced numbers to increase involvement" },

  // ── Game Form ───────────────────────────────────────────────────────────
  { category: "game_form", name: "1v1", description: "One versus one" },
  { category: "game_form", name: "2v2", description: "Two versus two" },
  { category: "game_form", name: "3v3", description: "Three versus three" },
  { category: "game_form", name: "4v4", description: "Four versus four" },
  { category: "game_form", name: "5v5", description: "Five versus five" },
  { category: "game_form", name: "3v3+1", description: "Three versus three with a neutral" },
  { category: "game_form", name: "4v4+GK", description: "Four versus four with goalkeepers" },

  // ── Intensity ───────────────────────────────────────────────────────────
  { category: "intensity", name: "Low", description: "Recovery or light technical work" },
  { category: "intensity", name: "Medium", description: "Moderate physical and cognitive demand" },
  { category: "intensity", name: "High", description: "Maximum effort, match-like intensity" },

  // ── Equipment ───────────────────────────────────────────────────────────
  { category: "equipment", name: "Cones", description: "Marker cones" },
  { category: "equipment", name: "Bibs", description: "Colored vests/bibs for team identification" },
  { category: "equipment", name: "Balls", description: "Sport balls" },
  { category: "equipment", name: "Goals (small)", description: "Small pop-up or pugg goals" },
  { category: "equipment", name: "Goals (full-size)", description: "Standard full-size goals" },
  { category: "equipment", name: "Poles", description: "Agility poles" },
  { category: "equipment", name: "Hurdles", description: "Small hurdles for coordination" },
  { category: "equipment", name: "Ladders", description: "Agility ladders" },

  // ── Success Criteria ────────────────────────────────────────────────────
  { category: "success_criteria", name: "Reach zone", description: "Player reaches a designated area" },
  { category: "success_criteria", name: "Complete sequence", description: "Execute a defined sequence of actions" },
  { category: "success_criteria", name: "Maintain possession", description: "Keep control for a set duration or number of passes" },
  { category: "success_criteria", name: "Score goal", description: "Score in a goal or target" },
  { category: "success_criteria", name: "Dribble past", description: "Successfully dribble past a defender" },
];

async function seed() {
  await connectDB();

  // Upsert taxonomy items
  let created = 0;
  for (const item of SEED_DATA) {
    const filter = {
      category: item.category,
      name: item.name,
      sport: item.sport || null,
    };
    const res = await Taxonomy.findOneAndUpdate(filter, item, { upsert: true, new: true });
    if (res.createdAt.getTime() === res.updatedAt.getTime()) created++;
  }
  console.log(`Taxonomy: ${created} created, ${SEED_DATA.length - created} already existed`);

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
