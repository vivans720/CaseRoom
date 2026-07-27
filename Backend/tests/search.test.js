const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const Case = require("../src/models/Case");
const Message = require("../src/models/Message");
const User = require("../src/models/User");
const { createTestUser, getAuthHeader } = require("./helpers/authHelper");

describe("Search API Phase 9", () => {
  // Ensure text indexes are built
  beforeAll(async () => {
    await Case.init();
    await Message.init();
  });

  describe("GET /api/v1/cases/search — Case Search", () => {
    let creatorToken, creatorUser;
    let participantToken, participantUser;
    let nonParticipantToken;
    let activeCase1, activeCase2, archivedCase, secretCase;

    beforeEach(async () => {
      // Create users
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
        employeeId: "NONPART",
        email: "nonpart@test.com",
      });
      nonParticipantToken = nonParticipant.token;

      // Seed cases manually to manipulate dates, titles, and descriptions
      const caseBase = { creatorId: creatorUser._id };
      
      activeCase1 = await Case.create({
        ...caseBase,
        title: "Project Alpha Launch",
        description: "Routine deployment.",
        status: "active",
        participants: [
          { user: creatorUser._id, role: "Admin" },
          { user: participantUser._id, role: "Editor" },
        ],
        createdAt: new Date("2026-01-10T10:00:00Z"),
        updatedAt: new Date("2026-01-10T10:00:00Z"),
      });

      activeCase2 = await Case.create({
        ...caseBase,
        title: "Beta Bug Fixes",
        description: "urgent bug fix for Project Alpha.",
        status: "active",
        participants: [
          { user: creatorUser._id, role: "Admin" },
          { user: participantUser._id, role: "Editor" },
        ],
        createdAt: new Date("2026-01-20T10:00:00Z"),
        updatedAt: new Date("2026-01-25T10:00:00Z"),
      });

      archivedCase = await Case.create({
        ...caseBase,
        title: "Old System Migration",
        description: "Migration details.",
        status: "archived",
        participants: [
          { user: creatorUser._id, role: "Admin" },
          { user: participantUser._id, role: "Editor" },
        ],
        createdAt: new Date("2025-12-01T10:00:00Z"),
        updatedAt: new Date("2025-12-05T10:00:00Z"),
      });

      secretCase = await Case.create({
        ...caseBase,
        title: "Secret Project Alpha",
        description: "Highly classified.",
        status: "active",
        participants: [{ user: creatorUser._id, role: "Admin" }], // ONLY creator
        createdAt: new Date("2026-02-01T10:00:00Z"),
        updatedAt: new Date("2026-02-01T10:00:00Z"),
      });
    });

    it("1. Search cases by keyword in title", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?q=Alpha")
        .set(getAuthHeader(creatorToken));

      expect(res.status).toBe(200);
      expect(res.body.data.cases.length).toBe(3); // Project Alpha Launch, Beta Bug Fixes (desc), Secret Project Alpha
      // Note: "Alpha" matches both title and desc. Let's make sure test cases match exact titles
    });

    it("2. Search cases by keyword in description", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?q=\"urgent bug fix\"")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.cases.length).toBe(1);
      expect(res.body.data.cases[0]._id).toBe(activeCase2._id.toString());
    });

    it("3. Search returns only participant's cases", async () => {
      // Participant searches for "Secret", should get nothing because they are not a participant
      const res = await request(app)
        .get("/api/v1/cases/search?q=Secret")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.cases.length).toBe(0);
    });

    it("4. Filter by status=active", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?status=active")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.cases.length).toBe(2); // Case1, Case2
      res.body.data.cases.forEach(c => expect(c.status).toBe("active"));
    });

    it("5. Filter by status=archived", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?status=archived")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.cases.length).toBe(1);
      expect(res.body.data.cases[0].status).toBe("archived");
    });

    it("6. Filter by date range (dateFrom only)", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?dateFrom=2026-01-15T00:00:00Z")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.cases.length).toBe(1); // activeCase2
      expect(res.body.data.cases[0]._id).toBe(activeCase2._id.toString());
    });

    it("7. Filter by date range (dateTo only)", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?dateTo=2025-12-31T23:59:59Z")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.cases.length).toBe(1); // archivedCase
      expect(res.body.data.cases[0]._id).toBe(archivedCase._id.toString());
    });

    it("8. Filter by date range (both dateFrom & dateTo)", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?dateFrom=2026-01-01T00:00:00Z&dateTo=2026-01-31T23:59:59Z")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.cases.length).toBe(2); // activeCase1 & 2
    });

    it("9. Filter by creatorId", async () => {
      const res = await request(app)
        .get(`/api/v1/cases/search?creatorId=${creatorUser._id}`)
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      // participant only has access to 3 of them created by this user
      expect(res.body.data.cases.length).toBe(3); 
    });

    it("10. Combined filters: keyword + status", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?q=Alpha&status=active")
        .set(getAuthHeader(creatorToken));

      expect(res.status).toBe(200);
      // project alpha launch, beta bug fixes (desc mentions alpha), secret project alpha
      expect(res.body.data.cases.length).toBe(3);
    });

    it("11. Sort by newest (default)", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?sortBy=newest")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      // Case dates: Case2 (Jan 20), Case1 (Jan 10), Archived (Dec 1)
      expect(res.body.data.cases[0]._id).toBe(activeCase2._id.toString());
      expect(res.body.data.cases[2]._id).toBe(archivedCase._id.toString());
    });

    it("12. Sort by oldest", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?sortBy=oldest")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.cases[0]._id).toBe(archivedCase._id.toString());
      expect(res.body.data.cases[2]._id).toBe(activeCase2._id.toString());
    });

    it("13. Sort by recently_active", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?sortBy=recently_active")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      // Case updatedAt dates: Case2 (Jan 25), Case1 (Jan 10), Archived (Dec 5) 
      expect(res.body.data.cases[0]._id).toBe(activeCase2._id.toString());
      expect(res.body.data.cases[1]._id).toBe(activeCase1._id.toString());
    });

    it("14. Pagination works correctly", async () => {
      // Participant has 3 cases. Limit 2, page 1 => 2 cases. Page 2 => 1 case.
      const res = await request(app)
        .get("/api/v1/cases/search?page=1&limit=2")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.cases.length).toBe(2);
      expect(res.body.data.pagination.totalPages).toBe(2);
      expect(res.body.data.pagination.totalCases).toBe(3);
    });

    it("15. Empty search results", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?q=NonExistentXYZ123")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.cases.length).toBe(0);
      expect(res.body.data.pagination.totalCases).toBe(0);
    });

    it("16. Invalid status value returns 400", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?status=invalid")
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid status");
    });

    it("17. Search without token fails", async () => {
      const res = await request(app)
        .get("/api/v1/cases/search?q=test");

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/cases/:id/messages/search — Message Search", () => {
    let participantToken, participantUser;
    let nonParticipantToken;
    let testCase;
    let mText1, mText2, mImage, mDoc, mDeleted;

    beforeEach(async () => {
      const participant = await createTestUser(app, {
        employeeId: "PARTMSGS",
        email: "partmsgs@test.com",
      });
      participantToken = participant.token;
      participantUser = participant.user;

      const nonParticipant = await createTestUser(app, {
        employeeId: "NONPARTMSGS",
        email: "nonpartmsgs@test.com",
      });
      nonParticipantToken = nonParticipant.token;

      testCase = await Case.create({
        title: "Message Search Case",
        status: "active",
        creatorId: participantUser._id,
        participants: [{ user: participantUser._id, role: "Admin" }],
      });

      // Seed messages
      mText1 = await Message.create({
        caseId: testCase._id,
        senderId: participantUser._id,
        content: "hello world report",
        type: "text",
      });

      mText2 = await Message.create({
        caseId: testCase._id,
        senderId: participantUser._id,
        content: "something completely different",
        type: "text",
      });

      mImage = await Message.create({
        caseId: testCase._id,
        senderId: participantUser._id,
        content: "checkout this hello image",
        type: "image",
      });

      mDoc = await Message.create({
        caseId: testCase._id,
        senderId: participantUser._id,
        content: "final report",
        type: "document",
      });

      // Simulating a soft-deleted message by manually adding it without schema strictly stopping it
      // if using strict schema, we make sure it works by update or flexible schema
      mDeleted = new Message({
        caseId: testCase._id,
        senderId: participantUser._id,
        content: "deleted hello message",
        type: "text",
      });
      // forcibly add isDeleted property ignoring schema strictness if needed, but we can set it via raw mongodb update
      await mDeleted.save(); // save normally
      await Message.updateOne({ _id: mDeleted._id }, { $set: { isDeleted: true } });
    });

    it("18. Search messages by keyword", async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/search?q=hello`)
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.messages.length).toBe(2); // mText1, mImage (mDeleted is ignored by logic)
    });

    it("19. Filter by message type=text", async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/search?type=text`)
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.messages.length).toBe(2); // mText1, mText2
    });

    it("20. Filter by message type=image", async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/search?type=image`)
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.messages.length).toBe(1);
      expect(res.body.data.messages[0]._id).toBe(mImage._id.toString());
    });

    it("21. Combined: keyword + type filter", async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/search?q=report&type=document`)
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      // Both mText1 and mDoc match "report", but only mDoc is type "document"
      expect(res.body.data.messages.length).toBe(1);
      expect(res.body.data.messages[0]._id).toBe(mDoc._id.toString());
    });

    it("22. Pagination works correctly", async () => {
      // 4 active messages total. page 1, limit 2 => 2 items
      const res = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/search?page=1&limit=2`)
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.messages.length).toBe(2);
      expect(res.body.data.pagination.totalPages).toBe(2);
    });

    it("23. Empty search results", async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/search?q=NonExistentXYZ123`)
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.data.messages.length).toBe(0);
    });

    it("24. Excludes soft-deleted messages", async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/search?q=deleted`)
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      // The word 'deleted' only appears in mDeleted, which is logically deleted.
      expect(res.body.data.messages.length).toBe(0);
    });

    it("25. Non-participant cannot search messages", async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/search?q=hello`)
        .set(getAuthHeader(nonParticipantToken));

      expect(res.status).toBe(403);
    });

    it("26. Non-existent case returns 404", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/cases/${fakeId}/messages/search?q=hello`)
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(404);
    });

    it("27. Search without token fails", async () => {
      const res = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/search?q=hello`);

      expect(res.status).toBe(401);
    });
  });
});
