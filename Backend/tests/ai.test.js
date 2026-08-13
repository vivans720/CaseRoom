const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const Case = require("../src/models/Case");
const Message = require("../src/models/Message");
const jwt = require("jsonwebtoken");

// Mock LangChain JS dynamic imports so tests run fast without local Ollama/ChromaDB
jest.mock("../src/config/langchain", () => {
  const mockChain = {
    pipe: jest.fn().mockImplementation(() => mockChain),
    invoke: jest.fn().mockResolvedValue(
      JSON.stringify({
        summary: "Mock summary of chat investigation.",
        issues: ["Mock login error"],
        decisions: ["Restarted service"],
        pendingWork: ["Monitor metrics"],
        finalStatus: "Resolved",
      })
    ),
  };
  const mockVectorStore = {
    addDocuments: jest.fn().mockResolvedValue(true),
    similaritySearchWithScore: jest.fn().mockImplementation(async (text) => []),
    similaritySearch: jest.fn().mockImplementation(async (text) => []),
  };
  return {
    getLLM: jest.fn().mockResolvedValue(mockChain),
    getEmbeddings: jest.fn().mockResolvedValue({}),
    getVectorStore: jest.fn().mockResolvedValue(mockVectorStore),
    getEvidenceVectorStore: jest.fn().mockResolvedValue(mockVectorStore),
    getClaimVectorStore: jest.fn().mockResolvedValue(mockVectorStore),
  };
});

describe("AI Endpoints API", () => {
  let token;
  let user;
  let testCase;

  beforeEach(async () => {
    user = await User.create({
      employeeId: `EMP-${Date.now()}`,
      name: "Test AI User",
      email: `ai.user.${Date.now()}@example.com`,
      phone: "1234567890",
      passwordHash: "hashedpassword",
    });

    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "testsecret", {
      expiresIn: "1h",
    });

    testCase = await Case.create({
      title: "Authentication Failure Investigation",
      description: "Users unable to login via OTP service",
      creatorId: user._id,
      participants: [{ user: user._id, role: "Admin" }],
    });

    await Message.create({
      caseId: testCase._id,
      senderId: user._id,
      content: "Users reporting 504 gateway timeout on login OTP request",
    });
  });

  describe("POST /api/v1/ai/chat-summary", () => {
    it("should return 401 if unauthenticated", async () => {
      const res = await request(app)
        .post("/api/v1/ai/chat-summary")
        .send({ caseId: testCase._id });

      expect(res.statusCode).toEqual(401);
    });

    it("should return 400 if caseId is missing", async () => {
      const res = await request(app)
        .post("/api/v1/ai/chat-summary")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain("caseId is required");
    });

    it("should return chat summary for valid case", async () => {
      const res = await request(app)
        .post("/api/v1/ai/chat-summary")
        .set("Authorization", `Bearer ${token}`)
        .send({ caseId: testCase._id });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.issues).toBeDefined();
    });
  });

  describe("GET /api/v1/ai/search", () => {
    it("should return 400 if search query q is missing", async () => {
      const res = await request(app)
        .get("/api/v1/ai/search")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(400);
    });

    it("should return search results", async () => {
      const res = await request(app)
        .get("/api/v1/ai/search?q=Authentication")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/ai/similar-cases/:caseId", () => {
    it("should return similar cases list", async () => {
      const res = await request(app)
        .get(`/api/v1/ai/similar-cases/${testCase._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("POST /api/v1/ai/duplicate-check", () => {
    it("should check duplicate case title", async () => {
      const res = await request(app)
        .post("/api/v1/ai/duplicate-check")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Authentication Failure Investigation", description: "Users unable to login" });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isDuplicate).toBeDefined();
    });
  });

  describe("POST /api/v1/ai/timeline", () => {
    it("should return timeline events for case", async () => {
      const res = await request(app)
        .post("/api/v1/ai/timeline")
        .set("Authorization", `Bearer ${token}`)
        .send({ caseId: testCase._id });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timeline).toBeDefined();
    });
  });

  describe("POST /api/v1/ai/extract-tasks", () => {
    it("should extract action items from chat", async () => {
      const res = await request(app)
        .post("/api/v1/ai/extract-tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({ caseId: testCase._id });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.tasks)).toBe(true);
    });
  });

  describe("RAG assistant endpoints", () => {
    it("rejects an unauthenticated case assistant request", async () => {
      const res = await request(app).post("/api/v1/ai/case-assistant").send({ caseId: testCase._id, question: "What happened?" });
      expect(res.statusCode).toEqual(401);
    });

    it("returns a cited-answer shape without inventing evidence", async () => {
      const res = await request(app)
        .post("/api/v1/ai/case-assistant")
        .set("Authorization", `Bearer ${token}`)
        .send({ caseId: testCase._id, question: "What happened?" });
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.answer).toBeDefined();
      expect(res.body.data.citations).toEqual([]);
      expect(res.body.data.conversationId).toBeDefined();
    });
  });
});
