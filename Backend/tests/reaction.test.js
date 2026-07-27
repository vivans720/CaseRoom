const http = require("http");
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const initializeSocket = require("../src/sockets");
const { createTestUser, getAuthHeader } = require("./helpers/authHelper");
const { createTestCase } = require("./helpers/caseHelper");
const {
  createSocketClient,
  waitForEvent,
  disconnectSocket,
} = require("./helpers/socketHelper");
const Message = require("../src/models/Message");
const {
  toggleReaction,
  removeReaction,
} = require("../src/services/message.service");

describe("Message Reactions", () => {
  let httpServer;
  let io;

  let participantToken, participantUser;
  let testCase;
  let message;

  let sockets = [];

  beforeAll((done) => {
    httpServer = http.createServer(app);
    io = initializeSocket(httpServer);
    app.set("io", io);
    httpServer.listen(0, done);
  });

  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  beforeEach(async () => {
    const p1 = await createTestUser(app, {
      employeeId: "REACTION_USER",
      email: "reaction@test.com",
    });
    participantToken = p1.token;
    participantUser = p1.user;

    testCase = await createTestCase(app, participantToken);

    message = await Message.create({
      caseId: testCase._id,
      senderId: participantUser._id,
      content: "Reaction Test Message",
    });
  });

  afterEach(() => {
    sockets.forEach(disconnectSocket);
    sockets = [];
  });

  describe("Service Methods", () => {
    it("should add a reaction to a message", async () => {
      const emoji = "👍";
      const reactions = await toggleReaction(
        message._id,
        participantUser._id,
        emoji,
      );

      expect(reactions.length).toBe(1);
      expect(reactions[0].emoji).toBe(emoji);
      expect(reactions[0].userIds.map((id) => id.toString())).toContain(
        participantUser._id.toString(),
      );
    });

    it("should remove reaction when same emoji is clicked again", async () => {
      const emoji = "👍";
      await toggleReaction(message._id, participantUser._id, emoji);
      const reactions = await toggleReaction(
        message._id,
        participantUser._id,
        emoji,
      );

      expect(reactions.length).toBe(0);
    });

    it("should remove a reaction from a message", async () => {
      const emoji = "👍";
      await toggleReaction(message._id, participantUser._id, emoji);
      const reactions = await removeReaction(
        message._id,
        participantUser._id,
        emoji,
      );

      expect(reactions.length).toBe(0);
    });

    it("should only remove the specific user's reaction", async () => {
      const user2 = new mongoose.Types.ObjectId();
      const emoji = "👍";
      await toggleReaction(message._id, participantUser._id, emoji);
      await toggleReaction(message._id, user2, emoji);

      const reactions = await removeReaction(
        message._id,
        participantUser._id,
        emoji,
      );

      expect(reactions.length).toBe(1);
      expect(reactions[0].userIds.length).toBe(1);
      expect(reactions[0].userIds.map((id) => id.toString())).toContain(
        user2.toString(),
      );
    });
  });

  describe("Socket Events", () => {
    it("should broadcast reaction_updated event", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      socket.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socket, "joined_case");

      const emoji = "❤️";
      socket.emit("toggle_reaction", {
        caseId: testCase._id,
        messageId: message._id.toString(),
        emoji,
      });

      const data = await waitForEvent(socket, "reaction_updated");
      expect(data.messageId).toBe(message._id.toString());
      expect(data.reactions.length).toBe(1);
      expect(data.reactions[0].emoji).toBe(emoji);
    });

    it("should remove reaction when toggled twice", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      socket.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socket, "joined_case");

      const emoji = "😂";

      socket.emit("toggle_reaction", {
        caseId: testCase._id,
        messageId: message._id.toString(),
        emoji,
      });

      await waitForEvent(socket, "reaction_updated");

      socket.emit("toggle_reaction", {
        caseId: testCase._id,
        messageId: message._id.toString(),
        emoji,
      });

      const data = await waitForEvent(socket, "reaction_updated");
      expect(data.messageId).toBe(message._id.toString());
      expect(data.reactions.length).toBe(0);
    });
  });
});
