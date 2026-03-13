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
const Drill = require("../src/models/Drill");
const User = require("../src/models/User");

let token;
let userId;

beforeEach(async () => {
  await User.deleteMany({});
  await Drill.deleteMany({});
  const res = await request(app).post("/api/auth/register").send({
    name: "Test Coach",
    email: "coach@test.com",
    password: "password123",
  });
  token = res.body.token;
  userId = res.body.user._id;
});

describe("Drills API", () => {
  const drillData = {
    title: "Rondo 4v2",
    purpose: "Improve passing under pressure and spatial awareness",
    sport: "football",
    intensity: "medium",
    duration: 15,
    guidedQuestions: ["Where should you position yourself?"],
    rules: ["Maximum 2 touches"],
  };

  describe("POST /api/drills", () => {
    it("should create a drill", async () => {
      const res = await request(app)
        .post("/api/drills")
        .set("Authorization", `Bearer ${token}`)
        .send(drillData);
      expect(res.status).toBe(201);
      expect(res.body.title).toBe(drillData.title);
      expect(res.body.purpose).toBe(drillData.purpose);
      expect(res.body.createdBy).toBe(userId);
    });

    it("should require title", async () => {
      const res = await request(app)
        .post("/api/drills")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...drillData, title: "" });
      expect(res.status).toBe(400);
    });

    it("should require auth", async () => {
      const res = await request(app).post("/api/drills").send(drillData);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/drills", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/drills")
        .set("Authorization", `Bearer ${token}`)
        .send(drillData);
      await request(app)
        .post("/api/drills")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...drillData, title: "Passing Square" });
    });

    it("should list drills with pagination", async () => {
      const res = await request(app)
        .get("/api/drills")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.drills).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
    });

    it("should filter by sport", async () => {
      await request(app)
        .post("/api/drills")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...drillData, title: "Handball drill", sport: "handball" });

      const res = await request(app)
        .get("/api/drills?sport=handball")
        .set("Authorization", `Bearer ${token}`);
      expect(res.body.drills).toHaveLength(1);
      expect(res.body.drills[0].title).toBe("Handball drill");
    });
  });

  describe("GET /api/drills/:id", () => {
    it("should return a single drill", async () => {
      const create = await request(app)
        .post("/api/drills")
        .set("Authorization", `Bearer ${token}`)
        .send(drillData);

      const res = await request(app)
        .get(`/api/drills/${create.body._id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe(drillData.title);
    });

    it("should 404 for invalid id", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/drills/${fakeId}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/drills/:id", () => {
    it("should update a drill", async () => {
      const create = await request(app)
        .post("/api/drills")
        .set("Authorization", `Bearer ${token}`)
        .send(drillData);

      const res = await request(app)
        .put(`/api/drills/${create.body._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Updated Rondo" });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Rondo");
    });
  });

  describe("DELETE /api/drills/:id", () => {
    it("should delete a drill", async () => {
      const create = await request(app)
        .post("/api/drills")
        .set("Authorization", `Bearer ${token}`)
        .send(drillData);

      const res = await request(app)
        .delete(`/api/drills/${create.body._id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);

      const check = await request(app)
        .get(`/api/drills/${create.body._id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(check.status).toBe(404);
    });
  });

  describe("POST /api/drills/:id/reflections", () => {
    it("should add a reflection note", async () => {
      const create = await request(app)
        .post("/api/drills")
        .set("Authorization", `Bearer ${token}`)
        .send(drillData);

      const res = await request(app)
        .post(`/api/drills/${create.body._id}/reflections`)
        .set("Authorization", `Bearer ${token}`)
        .send({ note: "Players struggled with spatial awareness" });
      expect(res.status).toBe(200);
      expect(res.body.reflectionNotes).toHaveLength(1);
      expect(res.body.reflectionNotes[0].note).toBe("Players struggled with spatial awareness");
    });
  });
});
