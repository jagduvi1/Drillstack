const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.ENABLE_MEILISEARCH = "false";
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const app = require("../src/index");
const User = require("../src/models/User");
const Drill = require("../src/models/Drill");
const TrainingSession = require("../src/models/TrainingSession");

let token;
let drillId;

beforeEach(async () => {
  await User.deleteMany({});
  await Drill.deleteMany({});
  await TrainingSession.deleteMany({});

  const reg = await request(app).post("/api/auth/register").send({
    name: "Test Coach",
    email: "coach@test.com",
    password: "password123",
  });
  token = reg.body.token;

  const drill = await request(app)
    .post("/api/drills")
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "Rondo", purpose: "Passing", duration: 15, intensity: "medium" });
  drillId = drill.body._id;
});

describe("Sessions API", () => {
  const sessionData = () => ({
    title: "Monday Training",
    date: "2026-03-16",
    sport: "football",
    sections: [
      { type: "information", drills: [], notes: "Explain today's focus" },
      { type: "warmup", drills: [{ drill: drillId, duration: 10 }], notes: "" },
      { type: "train_the_purpose", drills: [{ drill: drillId, duration: 20 }], notes: "" },
      { type: "cooldown", drills: [], notes: "Light stretching" },
      { type: "reflection", drills: [], notes: "" },
    ],
  });

  describe("POST /api/sessions", () => {
    it("should create a session and compute total duration", async () => {
      const res = await request(app)
        .post("/api/sessions")
        .set("Authorization", `Bearer ${token}`)
        .send(sessionData());
      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Monday Training");
      expect(res.body.totalDuration).toBe(30);
      expect(res.body.sections).toHaveLength(5);
    });
  });

  describe("GET /api/sessions", () => {
    it("should list sessions", async () => {
      await request(app)
        .post("/api/sessions")
        .set("Authorization", `Bearer ${token}`)
        .send(sessionData());

      const res = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.sessions).toHaveLength(1);
    });
  });

  describe("DELETE /api/sessions/:id", () => {
    it("should delete a session", async () => {
      const create = await request(app)
        .post("/api/sessions")
        .set("Authorization", `Bearer ${token}`)
        .send(sessionData());

      const res = await request(app)
        .delete(`/api/sessions/${create.body._id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });
});
