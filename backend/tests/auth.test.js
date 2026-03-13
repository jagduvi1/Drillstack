const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Setup in-memory mongo before loading the app
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

afterEach(async () => {
  await User.deleteMany({});
});

describe("Auth API", () => {
  const userData = {
    name: "Test Coach",
    email: "test@example.com",
    password: "password123",
  };

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/api/auth/register").send(userData);
      expect(res.status).toBe(201);
      expect(res.body.user.name).toBe(userData.name);
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
    });

    it("should reject duplicate email", async () => {
      await request(app).post("/api/auth/register").send(userData);
      const res = await request(app).post("/api/auth/register").send(userData);
      expect(res.status).toBe(409);
    });

    it("should reject invalid email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...userData, email: "not-an-email" });
      expect(res.status).toBe(400);
    });

    it("should reject short password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...userData, password: "12345" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send(userData);
    });

    it("should login with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: userData.email, password: userData.password });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it("should reject wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: userData.email, password: "wrong" });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return user when authenticated", async () => {
      const reg = await request(app).post("/api/auth/register").send(userData);
      const token = reg.body.token;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(userData.email);
    });

    it("should reject without token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });
  });
});
