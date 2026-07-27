// Backend/tests/case.test.js
const request = require("supertest");
const app = require("../src/app");
const { createTestUser, getAuthHeader } = require("./helpers/authHelper");
const { createTestCase, defaultCaseData } = require("./helpers/caseHelper");

describe("Case API", () => {
  let creatorToken, creatorUser;
  let participantToken, participantUser;
  let nonParticipantToken, nonParticipantUser;

  beforeEach(async () => {
    // Setup users
    const creator = await createTestUser(app, {
      employeeId: "CREATOR",
      email: "creator@test.com",
    });
    creatorToken = creator.token;
    creatorUser = creator.user;

    const participant = await createTestUser(app, {
      employeeId: "PARTICIPANT",
      email: "participant@test.com",
    });
    participantToken = participant.token;
    participantUser = participant.user;

    const nonParticipant = await createTestUser(app, {
      employeeId: "OTHER",
      email: "other@test.com",
    });
    nonParticipantToken = nonParticipant.token;
    nonParticipantUser = nonParticipant.user;
  });

  describe("POST /api/v1/cases", () => {
    it("should create case with valid data", async () => {
      const response = await request(app)
        .post("/api/v1/cases")
        .set(getAuthHeader(creatorToken))
        .send(defaultCaseData);

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe(defaultCaseData.title);
      expect(response.body.data.creatorId).toBe(creatorUser._id);
      expect(
        response.body.data.participants.some(
          (p) => (p.user ? p.user._id || p.user : p) === creatorUser._id,
        ),
      ).toBe(true);
      expect(response.body.data.priority).toBe("Medium");
      expect(response.body.data.category).toBe("Incident");
    });

    it("should create case with custom priority and category", async () => {
      const response = await request(app)
        .post("/api/v1/cases")
        .set(getAuthHeader(creatorToken))
        .send({
          title: "Legal Dispute",
          priority: "Critical",
          category: "Legal",
        });

      expect(response.status).toBe(201);
      expect(response.body.data.priority).toBe("Critical");
      expect(response.body.data.category).toBe("Legal");
    });

    it("should fail without token", async () => {
      const response = await request(app).post("/api/v1/cases").send(defaultCaseData);
      expect(response.status).toBe(401);
    });

    it("should fail with missing title", async () => {
      const response = await request(app)
        .post("/api/v1/cases")
        .set(getAuthHeader(creatorToken))
        .send({ description: "Desc" });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/v1/cases", () => {
    it("should get cases for participant user", async () => {
      await createTestCase(app, creatorToken);

      const response = await request(app)
        .get("/api/v1/cases")
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should get empty array for user with no cases", async () => {
      const response = await request(app)
        .get("/api/v1/cases")
        .set(getAuthHeader(nonParticipantToken));

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe("GET /api/v1/cases/all", () => {
    it("should fetch all cases regardless of participation", async () => {
      await createTestCase(app, creatorToken);

      const response = await request(app)
        .get("/api/v1/cases/all")
        .set(getAuthHeader(nonParticipantToken));

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/v1/cases/:id", () => {
    it("should get case by ID as participant", async () => {
      const newCase = await createTestCase(app, creatorToken);

      const response = await request(app)
        .get(`/api/v1/cases/${newCase._id}`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(200);
      expect(response.body.data._id).toBe(newCase._id);
    });

    it("should fail as non-participant", async () => {
      const newCase = await createTestCase(app, creatorToken);

      const response = await request(app)
        .get(`/api/v1/cases/${newCase._id}`)
        .set(getAuthHeader(nonParticipantToken));

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Access denied");
    });

    it("should fail with non-existent ID", async () => {
      const fakeId = "60c72b2f9b1d8b001c8e4a9e"; 
      const response = await request(app)
        .get(`/api/v1/cases/${fakeId}`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Case not found");
    });
  });

  describe("PUT /api/v1/cases/:id/participants", () => {
    let testCase;
    beforeEach(async () => {
      testCase = await createTestCase(app, creatorToken);
    });

    it("should add participant as creator", async () => {
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(creatorToken))
        .send({ action: "add", userId: participantUser._id });

      expect(response.status).toBe(200);
      expect(
        response.body.data.participants.some(
          (p) => (p.user ? p.user._id || p.user : p) === participantUser._id,
        ),
      ).toBe(true);
    });

    it("should remove participant as creator", async () => {
      // Add first
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(creatorToken))
        .send({ action: "add", userId: participantUser._id });

      // Then remove
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(creatorToken))
        .send({ action: "remove", userId: participantUser._id });

      expect(response.status).toBe(200);
      expect(
        response.body.data.participants.some(
          (p) => (p.user ? p.user._id || p.user : p) === participantUser._id,
        ),
      ).toBe(false);
    });

    it("should fail as non-creator", async () => {
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(participantToken))
        .send({ action: "add", userId: nonParticipantUser._id });

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/Only case Admins|Only the case creator/);
    });

    it("should not remove creator from participants", async () => {
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(creatorToken))
        .send({ action: "remove", userId: creatorUser._id });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("The creator cannot be removed from the case");
    });

    it("should fail with invalid action value", async () => {
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(creatorToken))
        .send({ action: "invalid", userId: participantUser._id });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid action");
    });
  });

  describe("PUT /api/v1/cases/:id/archive", () => {
    let testCase;
    beforeEach(async () => {
      testCase = await createTestCase(app, creatorToken);
    });

    it("should archive case as creator", async () => {
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/archive`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("archived");
    });

    it("should fail as non-creator", async () => {
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/archive`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(403);
    });

    it("should fail to archive already archived case", async () => {
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/archive`)
        .set(getAuthHeader(creatorToken));

      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/archive`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Case is already archived");
    });
  });

  describe("PUT /api/v1/cases/:id/unarchive", () => {
    let testCase;
    beforeEach(async () => {
      testCase = await createTestCase(app, creatorToken);
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/archive`)
        .set(getAuthHeader(creatorToken));
    });

    it("should unarchive case as creator", async () => {
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/unarchive`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("active");
    });

    it("should fail as non-creator", async () => {
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/unarchive`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(403);
    });

    it("should fail to unarchive already active case", async () => {
      // First unarchive
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/unarchive`)
        .set(getAuthHeader(creatorToken));

      // Try unarchiving again
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/unarchive`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Case is not archived");
    });
  });

  describe("DELETE /api/v1/cases/:id", () => {
    let testCase;
    beforeEach(async () => {
      testCase = await createTestCase(app, creatorToken);
    });

    it("should delete case as creator", async () => {
      const response = await request(app)
        .delete(`/api/v1/cases/${testCase._id}`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(200);
      expect(response.body.data.message).toBe("Case successfully deleted");
    });

    it("should fail as non-creator", async () => {
      const response = await request(app)
        .delete(`/api/v1/cases/${testCase._id}`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(403);
    });

    it("should fail with non-existent case", async () => {
      const fakeId = "60c72b2f9b1d8b001c8e4a9e";
      const response = await request(app)
        .delete(`/api/v1/cases/${fakeId}`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/v1/cases/:id/participants", () => {
    let testCase;
    beforeEach(async () => {
      testCase = await createTestCase(app, creatorToken);
    });

    it("should get participants as participant", async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]._id).toBe(creatorUser._id);
    });

    it("should fail as non-participant", async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(nonParticipantToken));

      expect(response.status).toBe(403);
    });
  });

  describe("PUT /api/v1/cases/:id/pin", () => {
    let testCase;
    beforeEach(async () => {
      testCase = await createTestCase(app, creatorToken);
    });

    it("should pin a case for participant", async () => {
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/pin`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(200);
      expect(response.body.data.message).toBe("Case pinned successfully");
    });

    it("should fail for non-participant", async () => {
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/pin`)
        .set(getAuthHeader(nonParticipantToken));

      expect(response.status).toBe(403);
    });

    it("should enforce max 5 pinned cases limit", async () => {
      // Create 5 cases and pin them
      for (let i = 0; i < 5; i++) {
        const c = await createTestCase(app, creatorToken, { title: `Case ${i}` });
        await request(app).put(`/api/v1/cases/${c._id}/pin`).set(getAuthHeader(creatorToken));
      }

      // 6th case
      const case6 = await createTestCase(app, creatorToken, { title: "Case 6" });
      const response = await request(app)
        .put(`/api/v1/cases/${case6._id}/pin`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Max pin limit reached");
    });
  });

  describe("DELETE /api/v1/cases/:id/pin", () => {
    let testCase;
    beforeEach(async () => {
      testCase = await createTestCase(app, creatorToken);
      await request(app).put(`/api/v1/cases/${testCase._id}/pin`).set(getAuthHeader(creatorToken));
    });

    it("should unpin a pinned case", async () => {
      const response = await request(app)
        .delete(`/api/v1/cases/${testCase._id}/pin`)
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(200);
      expect(response.body.data.message).toBe("Case unpinned successfully");
    });
  });

  describe("Pinned cases in GET /api/v1/cases", () => {
    it("should return pinned cases first", async () => {
      const unpinnedCase = await createTestCase(app, creatorToken, { title: "Unpinned Case" });
      const pinnedCase = await createTestCase(app, creatorToken, { title: "Pinned Case" });

      await request(app).put(`/api/v1/cases/${pinnedCase._id}/pin`).set(getAuthHeader(creatorToken));

      const response = await request(app)
        .get("/api/v1/cases")
        .set(getAuthHeader(creatorToken));

      expect(response.status).toBe(200);
      expect(response.body.data[0]._id).toBe(pinnedCase._id);
      expect(response.body.data[0].isPinned).toBe(true);
      
      const unpinnedCaseFound = response.body.data.find(c => c._id === unpinnedCase._id);
      expect(unpinnedCaseFound.isPinned).toBe(false);
    });
  });

  describe("Role-Based Access Control (RBAC)", () => {
    let testCase;

    beforeEach(async () => {
      testCase = await createTestCase(app, creatorToken);
    });

    it("should allow creator (Admin) to add an Observer participant", async () => {
      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(creatorToken))
        .send({ action: "add", userId: participantUser._id, role: "Observer" });

      expect(response.status).toBe(200);

      const caseDetails = await request(app)
        .get(`/api/v1/cases/${testCase._id}`)
        .set(getAuthHeader(creatorToken));

      expect(caseDetails.status).toBe(200);
      const participantEntry = caseDetails.body.data.participants.find(
        (p) => (p.user ? p.user._id : p._id) === participantUser._id,
      );
      expect(participantEntry.role).toBe("Observer");
    });

    it("should allow Admin to update an existing participant's role", async () => {
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(creatorToken))
        .send({ action: "add", userId: participantUser._id, role: "Editor" });

      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(creatorToken))
        .send({ action: "updateRole", userId: participantUser._id, role: "Admin" });

      expect(response.status).toBe(200);
    });

    it("should reject non-Admin from adding or updating participant roles", async () => {
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(creatorToken))
        .send({ action: "add", userId: participantUser._id, role: "Observer" });

      const response = await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(participantToken))
        .send({ action: "add", userId: nonParticipantUser._id, role: "Editor" });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Only case Admins can manage participants");
    });
  });
});
