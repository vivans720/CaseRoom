// Backend/tests/message.test.js
const request = require("supertest");
const app = require("../src/app");
const { createTestUser, getAuthHeader } = require("./helpers/authHelper");
const { createTestCase } = require("./helpers/caseHelper");
const Message = require("../src/models/Message");
const messageService = require("../src/services/message.service");

describe("Message API", () => {
  let participantToken, participantUser;
  let nonParticipantToken;
  let testCase;

  beforeEach(async () => {
    // Setup users
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

    // Create a case using the participant token (makes them the creator/participant)
    testCase = await createTestCase(app, participantToken);
  });

  describe("GET /api/v1/cases/:id/messages", () => {
    it("should get messages as participant with default pagination", async () => {
      // Seed some messages manually to establish history
      await Message.create([
        { caseId: testCase._id, senderId: participantUser._id, content: "Hello 1" },
        { caseId: testCase._id, senderId: participantUser._id, content: "Hello 2" },
      ]);

      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(200);
      expect(response.body.data.messages.length).toBe(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.totalMessages).toBe(2);
      expect(response.body.data.pagination.limit).toBe(50); // Default limit
    });

    it("should get messages respecting custom limit and page", async () => {
      // Seed 15 messages quickly
      const msgs = Array.from({ length: 15 }).map((_, i) => ({
        caseId: testCase._id,
        senderId: participantUser._id,
        content: `Msg ${i}`,
      }));
      await Message.insertMany(msgs);

      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages?page=1&limit=10`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(200);
      expect(response.body.data.messages.length).toBe(10);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalMessages).toBe(15);
      expect(response.body.data.pagination.totalPages).toBe(2); // 15 / 10 rounded up
    });

    it("should fail as non-participant", async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages`)
        .set(getAuthHeader(nonParticipantToken));

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Forbidden");
    });

    it("should fail for non-existent case", async () => {
      const fakeId = "60c72b2f9b1d8b001c8e4a9e";
      const response = await request(app)
        .get(`/api/v1/cases/${fakeId}/messages`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Case not found");
    });

    it("should fail without token", async () => {
      const response = await request(app).get(`/api/v1/cases/${testCase._id}/messages`);
      expect(response.status).toBe(401);
    });

    it("should sort messages by createdAt descending (newest first)", async () => {
      // Create messages sequentially with slightly different fake dates
      const msg1 = await Message.create({ caseId: testCase._id, senderId: participantUser._id, content: "Older", createdAt: new Date(Date.now() - 1000) });
      const msg2 = await Message.create({ caseId: testCase._id, senderId: participantUser._id, content: "Newer", createdAt: new Date() });

      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(200);
      expect(response.body.data.messages.length).toBe(2);
      expect(response.body.data.messages[0]._id).toBe(msg2._id.toString()); // the newer message should be first
      expect(response.body.data.messages[1]._id).toBe(msg1._id.toString()); // the older message should be second
    });

    it("should calculate mathematical pagination bounds correctly", async () => {
      await Message.insertMany([{ caseId: testCase._id, senderId: participantUser._id, content: "A single msg" }]);
      
      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages?page=2&limit=50`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(200);
      expect(response.body.data.messages.length).toBe(0); // page 2 is completely empty since total is 1
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.totalPages).toBe(1);
    });
  });

  describe("GET /api/v1/cases/:id/unread-count", () => {
    it("should return unread count for participant", async () => {
      // Seed some messages
      await Message.create([
        { caseId: testCase._id, senderId: participantUser._id, content: "Msg 1" },
        { caseId: testCase._id, senderId: participantUser._id, content: "Msg 2" },
      ]);

      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/unread-count`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(200);
      expect(response.body.data.unreadCount).toBeDefined();
      expect(typeof response.body.data.unreadCount).toBe("number");
    });

    it("should fail for non-participant", async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/unread-count`)
        .set(getAuthHeader(nonParticipantToken));

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/cases/:id/messages/:messageId", () => {
    let messageToDelete;

    beforeEach(async () => {
      messageToDelete = await Message.create({
        caseId: testCase._id,
        senderId: participantUser._id,
        content: "Delete me",
      });
    });

    it("should soft-delete message as sender/participant", async () => {
      const response = await request(app)
        .delete(`/api/v1/cases/${testCase._id}/messages/${messageToDelete._id}`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(200);
      expect(response.body.data.isDeleted).toBe(true);
      expect(response.body.data.content).toBe(""); // Soft delete clears content
      
      // Verify in DB
      const dbMsg = await Message.findById(messageToDelete._id);
      expect(dbMsg.isDeleted).toBe(true);
    });

    it("should fail for non-participant", async () => {
      const response = await request(app)
        .delete(`/api/v1/cases/${testCase._id}/messages/${messageToDelete._id}`)
        .set(getAuthHeader(nonParticipantToken));

      expect(response.status).toBe(403);
    });

    it("should fail for non-existent message", async () => {
      const fakeMsgId = "60c72b2f9b1d8b001c8e4a9e";
      const response = await request(app)
        .delete(`/api/v1/cases/${testCase._id}/messages/${fakeMsgId}`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/v1/cases/:id/messages/:messageId", () => {
    let ownTextMessage;
    let ownFileMessage;

    beforeEach(async () => {
      ownTextMessage = await Message.create({
        caseId: testCase._id,
        senderId: participantUser._id,
        type: "text",
        content: "Original text",
      });

      ownFileMessage = await Message.create({
        caseId: testCase._id,
        senderId: participantUser._id,
        type: "document",
        content: "Original caption",
        fileUrl: "https://example.com/file.pdf",
        fileName: "file.pdf",
      });
    });

    it("should edit own text message and set editedAt", async () => {
      const response = await request(app)
        .patch(`/api/v1/cases/${testCase._id}/messages/${ownTextMessage._id}`)
        .set(getAuthHeader(participantToken))
        .send({ content: "Updated text" });

      expect(response.status).toBe(200);
      expect(response.body.data._id).toBe(ownTextMessage._id.toString());
      expect(response.body.data.content).toBe("Updated text");
      expect(response.body.data.editedAt).toBeDefined();

      const dbMsg = await Message.findById(ownTextMessage._id);
      expect(dbMsg.content).toBe("Updated text");
      expect(dbMsg.editedAt).toBeTruthy();
    });

    it("should reject editing by non-sender", async () => {
      const participantTwo = await createTestUser(app, {
        employeeId: "PARTICIPANT2",
        email: "participant2@test.com",
      });
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(participantToken))
        .send({ action: "add", userId: participantTwo.user._id });

      const response = await request(app)
        .patch(`/api/v1/cases/${testCase._id}/messages/${ownTextMessage._id}`)
        .set(getAuthHeader(participantTwo.token))
        .send({ content: "Nope" });

      expect(response.status).toBe(403);
    });

    it("should reject editing deleted messages", async () => {
      ownTextMessage.isDeleted = true;
      ownTextMessage.deletedAt = new Date();
      await ownTextMessage.save();

      const response = await request(app)
        .patch(`/api/v1/cases/${testCase._id}/messages/${ownTextMessage._id}`)
        .set(getAuthHeader(participantToken))
        .send({ content: "Try edit deleted" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Cannot edit a deleted message");
    });

    it("should reject editing messages in archived cases", async () => {
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/archive`)
        .set(getAuthHeader(participantToken));

      const response = await request(app)
        .patch(`/api/v1/cases/${testCase._id}/messages/${ownTextMessage._id}`)
        .set(getAuthHeader(participantToken))
        .send({ content: "Try edit archived" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Cannot edit messages in an archived case");
    });

    it("should reject empty text content", async () => {
      const response = await request(app)
        .patch(`/api/v1/cases/${testCase._id}/messages/${ownTextMessage._id}`)
        .set(getAuthHeader(participantToken))
        .send({ content: "   " });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Content is required for text messages");
    });

    it("should allow empty caption for file message", async () => {
      const response = await request(app)
        .patch(`/api/v1/cases/${testCase._id}/messages/${ownFileMessage._id}`)
        .set(getAuthHeader(participantToken))
        .send({ content: "   " });

      expect(response.status).toBe(200);
      expect(response.body.data.content).toBe("");
      expect(response.body.data.editedAt).toBeDefined();
    });
  });

  describe("GET /api/v1/cases/:id/messages/page/:messageId", () => {
    it("should resolve the correct page for a message", async () => {
      // Create 15 messages (limit 10 for testing)
      const msgs = Array.from({ length: 15 }).map((_, i) => ({
        caseId: testCase._id,
        senderId: participantUser._id,
        content: `Msg ${i + 1}`,
        createdAt: new Date(Date.now() + i * 1000), // Ensure deterministic order
      }));
      const savedMsgs = await Message.insertMany(msgs);
      
      // Since it's sorted by newest-first:
      // Page 1: Msg 15 to Msg 6 (10 messages)
      // Page 2: Msg 5 to Msg 1 (5 messages)

      // Test Msg 1 (oldest, should be on page 2)
      const res1 = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/page/${savedMsgs[0]._id}?limit=10`)
        .set(getAuthHeader(participantToken));
      
      expect(res1.status).toBe(200);
      expect(res1.body.data.page).toBe(2);

      // Test Msg 15 (newest, should be on page 1)
      const res15 = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/page/${savedMsgs[14]._id}?limit=10`)
        .set(getAuthHeader(participantToken));
      
      expect(res15.status).toBe(200);
      expect(res15.body.data.page).toBe(1);
    });

    it("should fail for non-existent message", async () => {
      const fakeId = "60c72b2f9b1d8b001c8e4a9e";
      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages/page/${fakeId}`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(404);
    });
  });

  describe("Message Population and Replies", () => {
    it("should populate replyTo with sender name and fileName", async () => {
      // 1. Create a file message to be replied to
      const fileMsg = await Message.create({
        caseId: testCase._id,
        senderId: participantUser._id,
        type: "document",
        fileUrl: "http://test.com/file.pdf",
        fileName: "test-file.pdf",
        fileSize: 1024,
        fileMimeType: "application/pdf",
        content: "File to reply to"
      });

      // 2. Create a reply
      await Message.create({
        caseId: testCase._id,
        senderId: participantUser._id,
        content: "Replying to file",
        replyTo: fileMsg._id
      });

      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages`)
        .set(getAuthHeader(participantToken));

      expect(response.status).toBe(200);
      const reply = response.body.data.messages.find(m => m.content === "Replying to file");
      expect(reply.replyTo).toBeDefined();
      expect(reply.replyTo._id).toBe(fileMsg._id.toString());
      expect(reply.replyTo.senderId.name).toBe(participantUser.name);
      expect(reply.replyTo.fileName).toBe("test-file.pdf");
    });
  });

  describe("Observer RBAC Restrictions", () => {
    let observerUser, observerToken, observerId;

    beforeEach(async () => {
      const observer = await createTestUser(app, {
        employeeId: "OBSERVER1",
        email: "observer1@test.com",
      });
      observerUser = observer.user;
      observerToken = observer.token;
      observerId = observerUser._id || observerUser.id;

      // Add user as Observer to testCase
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(participantToken))
        .send({ action: "add", userId: observerId, role: "Observer" });
    });

    it("should reject message creation from an Observer", async () => {
      await expect(
        messageService.createMessage({
          caseId: testCase._id,
          senderId: observerId,
          content: "Observer msg",
        }),
      ).rejects.toThrow("Observers are read-only");
    });

    it("should reject message edit from an Observer", async () => {
      const msg = await Message.create({
        caseId: testCase._id,
        senderId: observerId,
        content: "Original msg",
      });

      const response = await request(app)
        .patch(`/api/v1/cases/${testCase._id}/messages/${msg._id}`)
        .set(getAuthHeader(observerToken))
        .send({ content: "Edited text" });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Observers are read-only");
    });

    it("should reject message deletion from an Observer", async () => {
      const msg = await Message.create({
        caseId: testCase._id,
        senderId: observerId,
        content: "To delete",
      });

      const response = await request(app)
        .delete(`/api/v1/cases/${testCase._id}/messages/${msg._id}`)
        .set(getAuthHeader(observerToken));

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/Observers are read-only|not a participant/);
    });
  });
});
