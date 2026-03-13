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
const Taxonomy = require("../src/models/Taxonomy");

let token;

beforeEach(async () => {
  await User.deleteMany({});
  await Taxonomy.deleteMany({});

  const reg = await request(app).post("/api/auth/register").send({
    name: "Test Coach",
    email: "coach@test.com",
    password: "password123",
  });
  token = reg.body.token;
});

describe("Taxonomy API", () => {
  describe("POST /api/taxonomy", () => {
    it("should create a taxonomy item", async () => {
      const res = await request(app)
        .post("/api/taxonomy")
        .set("Authorization", `Bearer ${token}`)
        .send({ category: "equipment", name: "Cones", description: "Marker cones" });
      expect(res.status).toBe(201);
      expect(res.body.category).toBe("equipment");
      expect(res.body.name).toBe("Cones");
    });

    it("should reject without category", async () => {
      const res = await request(app)
        .post("/api/taxonomy")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Cones" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/taxonomy", () => {
    beforeEach(async () => {
      await Taxonomy.create({ category: "equipment", name: "Cones" });
      await Taxonomy.create({ category: "equipment", name: "Bibs" });
      await Taxonomy.create({ category: "intensity", name: "Low" });
    });

    it("should list all taxonomy items", async () => {
      const res = await request(app)
        .get("/api/taxonomy")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    it("should filter by category", async () => {
      const res = await request(app)
        .get("/api/taxonomy?category=equipment")
        .set("Authorization", `Bearer ${token}`);
      expect(res.body).toHaveLength(2);
    });
  });

  describe("GET /api/taxonomy/categories", () => {
    it("should list distinct categories", async () => {
      await Taxonomy.create({ category: "equipment", name: "Cones" });
      await Taxonomy.create({ category: "intensity", name: "Low" });

      const res = await request(app)
        .get("/api/taxonomy/categories")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toContain("equipment");
      expect(res.body).toContain("intensity");
    });
  });

  describe("DELETE /api/taxonomy/:id", () => {
    it("should delete a taxonomy item", async () => {
      const item = await Taxonomy.create({ category: "equipment", name: "Poles" });
      const res = await request(app)
        .delete(`/api/taxonomy/${item._id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });
});
