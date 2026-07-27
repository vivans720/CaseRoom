// Backend/tests/socket.test.js
const http = require("http");
const request = require("supertest");
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
const Notification = require("../src/models/Notification");

describe("Socket API", () => {
  let httpServer;
  let io;

  let participantToken, participantUser;
  let nonParticipantToken, nonParticipantUser;
  let testCase;
  let archivedCase;

  let sockets = [];

  // Spin up a live socket server before the tests run
  beforeAll((done) => {
    httpServer = http.createServer(app);
    io = initializeSocket(httpServer);
    app.set("io", io);
    httpServer.listen(0, done); // Bind to random ephemeral port
  });

  // Tear down live socket server once done
  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  beforeEach(async () => {
    // 1. Create a primary participant
    const p1 = await createTestUser(app, {
      employeeId: "SOCK_PART1",
      email: "sock1@test.com",
    });
    participantToken = p1.token;
    participantUser = p1.user;

    // 2. Create an unauthorized non-participant
    const np = await createTestUser(app, {
      employeeId: "SOCK_NONPART",
      email: "socknp@test.com",
    });
    nonParticipantToken = np.token;
    nonParticipantUser = np.user;

    // 3. Create an active test case (p1 is creator/participant by default)
    testCase = await createTestCase(app, participantToken, {
      title: "Active Socket Case",
    });

    // 4. Create an archived test case
    archivedCase = await createTestCase(app, participantToken, {
      title: "Archived Socket Case",
    });
    await request(app)
      .put(`/api/v1/cases/${archivedCase._id}/archive`)
      .set(getAuthHeader(participantToken));
  });

  afterEach(() => {
    // Cleanup any sockets left open by individual tests
    sockets.forEach(disconnectSocket);
    sockets = [];
  });

  describe("Connection & Authentication", () => {
    it("should connect with valid JWT token", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);
      expect(socket.connected).toBe(true);
    });

    it("should reject connection with invalid/expired JWT", async () => {
      await expect(
        createSocketClient(httpServer, "invalid.token.here"),
      ).rejects.toThrow("Authentication error");
    });

    it("should reject connection with no token", async () => {
      await expect(createSocketClient(httpServer, "")).rejects.toThrow(
        "Authentication error",
      );
    });
  });

  describe("join_case event", () => {
    it("should join case as participant", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      socket.emit("join_case", { caseId: testCase._id });
      const data = await waitForEvent(socket, "joined_case");

      expect(data.caseId).toBe(testCase._id);
    });

    it("should emit error without caseId", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      socket.emit("join_case", {});
      const error = await waitForEvent(socket, "error");

      expect(error.message).toBe("caseId is required");
    });

    it("should emit error for non-existent case", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      const fakeId = "60c72b2f9b1d8b001c8e4a9e";
      socket.emit("join_case", { caseId: fakeId });
      const error = await waitForEvent(socket, "error");

      expect(error.message).toBe("Case not found");
    });

    it("should emit error for archived case", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      socket.emit("join_case", { caseId: archivedCase._id });
      const error = await waitForEvent(socket, "error");

      expect(error.message).toBe("Case is not active");
    });

    it("should emit error as non-participant", async () => {
      const socket = await createSocketClient(httpServer, nonParticipantToken);
      sockets.push(socket);

      socket.emit("join_case", { caseId: testCase._id });
      const error = await waitForEvent(socket, "error");

      expect(error.message).toBe("You are not a participant of this case");
    });
  });

  describe("leave_case event", () => {
    it("should leave a joined case", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      socket.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socket, "joined_case");

      socket.emit("leave_case", { caseId: testCase._id });
      const data = await waitForEvent(socket, "left_case");

      expect(data.caseId).toBe(testCase._id);
    });

    it("should emit error without caseId", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      socket.emit("leave_case", {});
      const error = await waitForEvent(socket, "error");

      expect(error.message).toBe("caseId is required");
    });

    it("should emit info if leaving a case you aren't in", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      // Use a valid but random ObjectId that the user is NOT a participant of
      const otherCaseId = new (require("mongoose").Types.ObjectId)();
      socket.emit("leave_case", { caseId: otherCaseId });
      const info = await waitForEvent(socket, "info");

      expect(info.message).toContain("You are not in case");
    });
  });

  describe("send_message event", () => {
    it("should send message to active case room and save to DB", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      // Must join case to receive the broadcast back down the socket
      socket.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socket, "joined_case");

      socket.emit("send_message", {
        caseId: testCase._id,
        content: "Hello WS",
      });
      const msg = await waitForEvent(socket, "new_message");

      expect(msg.content).toBe("Hello WS");
      expect(msg.senderId._id).toBe(participantUser._id.toString());
      expect(msg.caseId).toBe(testCase._id);
    });

    it("should emit error without caseId", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      socket.emit("send_message", { content: "Test" });
      const error = await waitForEvent(socket, "error");
      expect(error.message).toBe("caseId and content are required");
    });

    it("should emit error without content", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      socket.emit("send_message", { caseId: testCase._id });
      const error = await waitForEvent(socket, "error");
      expect(error.message).toBe("caseId and content are required");
    });

    it("should emit error for archived case", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      socket.emit("send_message", {
        caseId: archivedCase._id,
        content: "Test",
      });
      const error = await waitForEvent(socket, "error");
      expect(error.message).toBe("Cannot send messages to an archived case");
    });

    it("should emit error as non-participant", async () => {
      const socket = await createSocketClient(httpServer, nonParticipantToken);
      sockets.push(socket);

      socket.emit("send_message", { caseId: testCase._id, content: "Hax" });
      const error = await waitForEvent(socket, "error");
      expect(error.message).toBe("You are not a participant of this case");
    });

    it("should broadcast new_message to OTHER clients in the room", async () => {
      // 1. Create User B and add them to the case
      const p2 = await createTestUser(app, {
        employeeId: "SOCK_P2",
        email: "p2@test.com",
      });
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(participantToken))
        .send({ action: "add", userId: p2.user._id });

      // 2. Connect both Socket A (User A) and Socket B (User B)
      const socketA = await createSocketClient(httpServer, participantToken);
      const socketB = await createSocketClient(httpServer, p2.token);
      sockets.push(socketA, socketB);

      // 3. Both users join the case chat
      socketA.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socketA, "joined_case");

      socketB.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socketB, "joined_case");

      // 4. Socket A sends a message
      socketA.emit("send_message", {
        caseId: testCase._id,
        content: "Broadcast!",
      });

      // 5. Socket B should successfully receive the broadcasted message
      const msg = await waitForEvent(socketB, "new_message");
      expect(msg.content).toBe("Broadcast!");
      expect(msg.senderId._id).toBe(participantUser._id.toString());
    });

    it("should create mention notification for mentioned participant", async () => {
      const p2 = await createTestUser(app, {
        employeeId: "SOCK_MENTION_P2",
        email: "mentionp2@test.com",
      });
      const p2Id = (p2.user._id || p2.user.id).toString();
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(participantToken))
        .send({ action: "add", userId: p2Id });

      const socketA = await createSocketClient(httpServer, participantToken);
      const socketB = await createSocketClient(httpServer, p2.token);
      sockets.push(socketA, socketB);

      socketA.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socketA, "joined_case");
      socketB.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socketB, "joined_case");

      const mentionNotificationPromise = waitForEvent(
        socketB,
        "new_notification",
      );
      socketA.emit("send_message", {
        caseId: testCase._id,
        content: "Hey @P2",
        mentionedUserIds: [p2Id],
      });

      const mentionNotification = await mentionNotificationPromise;
      expect(mentionNotification.type).toBe("mentioned_in_message");
      expect(mentionNotification.recipientId.toString()).toBe(p2Id);

      const savedMessage = await Message.findOne({
        caseId: testCase._id,
        content: "Hey @P2",
      });
      expect(savedMessage.mentions.map((id) => id.toString())).toContain(
        p2.user._id.toString(),
      );

      const mentionNotifInDb = await Notification.findOne({
        type: "mentioned_in_message",
        recipientId: p2.user._id,
      });
      expect(mentionNotifInDb).toBeTruthy();
    });

    it("should reject mentions for non-participants", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      socket.emit("send_message", {
        caseId: testCase._id,
        content: "Invalid mention",
        mentionedUserIds: [nonParticipantUser._id.toString()],
      });

      const error = await waitForEvent(socket, "error");
      expect(error.message).toBe(
        "You can only mention participants in this case",
      );
    });
  });

  describe("disconnect event", () => {
    it("should disconnect cleanly without throwing errors", async () => {
      const socket = await createSocketClient(httpServer, participantToken);
      sockets.push(socket);

      expect(socket.connected).toBe(true);
      disconnectSocket(socket);

      // Wait a bit for the connection state to update in the adapter
      await new Promise((res) => setTimeout(res, 200));
      expect(socket.connected).toBe(false);
    });
  });

  describe("message_deleted event", () => {
    it("should broadcast message_deleted when a message is deleted via REST", async () => {
      // 1. Setup: Participant A and B in a case
      const p2 = await createTestUser(app, {
        employeeId: "SOCK_P2",
        email: "p2@test.com",
      });
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(participantToken))
        .send({ action: "add", userId: p2.user._id });

      const socketA = await createSocketClient(httpServer, participantToken);
      const socketB = await createSocketClient(httpServer, p2.token);
      sockets.push(socketA, socketB);

      socketA.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socketA, "joined_case");
      socketB.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socketB, "joined_case");

      // 2. Create a message to delete
      const msg = await Message.create({
        caseId: testCase._id,
        senderId: participantUser._id,
        content: "To be deleted",
      });

      // Verify message exists in DB from test perspective
      const checkMsg = await Message.findById(msg._id);
      if (!checkMsg)
        throw new Error("Message not found in DB immediately after creation!");

      // 3. Delete via REST API and Wait for broadcast concurrently
      const [deleteRes, deletedData] = await Promise.all([
        request(httpServer)
          .delete(`/api/v1/cases/${testCase._id}/messages/${msg._id}`)
          .set(getAuthHeader(participantToken)),
        waitForEvent(socketB, "message_deleted"),
      ]);

      expect(deleteRes.status).toBe(200);
      expect(deletedData.messageId).toBe(msg._id.toString());
      expect(deletedData.caseId).toBe(testCase._id.toString());
    });
  });

  describe("message_edited event", () => {
    it("should broadcast message_edited to all case participants", async () => {
      const p2 = await createTestUser(app, {
        employeeId: "SOCK_EDIT_P2",
        email: "editp2@test.com",
      });
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(participantToken))
        .send({ action: "add", userId: p2.user._id });

      const socketA = await createSocketClient(httpServer, participantToken);
      const socketB = await createSocketClient(httpServer, p2.token);
      sockets.push(socketA, socketB);

      socketA.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socketA, "joined_case");
      socketB.emit("join_case", { caseId: testCase._id });
      await waitForEvent(socketB, "joined_case");

      const msg = await Message.create({
        caseId: testCase._id,
        senderId: participantUser._id,
        content: "Before edit",
      });

      const editedEventPromise = waitForEvent(socketB, "message_edited");
      socketA.emit("edit_message", {
        caseId: testCase._id,
        messageId: msg._id.toString(),
        content: "After edit",
      });

      const editedEvent = await editedEventPromise;
      expect(editedEvent._id).toBe(msg._id.toString());
      expect(editedEvent.content).toBe("After edit");
      expect(editedEvent.editedAt).toBeTruthy();
    });
  });
});
