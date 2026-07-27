const mongoose = require("mongoose");
const presenceService = require("../src/services/presence.service");

describe("Presence Service", () => {
  beforeEach(() => {
    // We can't directly reset the internal map easily without adding test hooks, 
    // but we can ensure clean state by removing added users explicitly in each test 
    // or by mocking. Let's use unique IDs for each test instead to avoid conflicts.
  });

  const getUniqueId = () => new mongoose.Types.ObjectId().toString(); // Use a simple string if no mongoose
  const generateId = () => Math.random().toString(36).substring(7);

  test("addUser returns true for first connection and false for subsequent connections", () => {
    const userId = generateId();
    const socketId1 = "socket_1";
    const socketId2 = "socket_2";

    const isFirst = presenceService.addUser(userId, socketId1);
    expect(isFirst).toBe(true);

    const isFirstAgain = presenceService.addUser(userId, socketId2);
    expect(isFirstAgain).toBe(false);
  });

  test("isOnline correctly reflects user status", () => {
    const userId = generateId();
    expect(presenceService.isOnline(userId)).toBe(false);

    presenceService.addUser(userId, "sock_1");
    expect(presenceService.isOnline(userId)).toBe(true);
  });

  test("removeUser returns true when last socket removed, false otherwise", () => {
    const userId = generateId();
    presenceService.addUser(userId, "s_1");
    presenceService.addUser(userId, "s_2");

    const isLast1 = presenceService.removeUser(userId, "s_1");
    expect(isLast1).toBe(false);
    expect(presenceService.isOnline(userId)).toBe(true);

    const isLast2 = presenceService.removeUser(userId, "s_2");
    expect(isLast2).toBe(true);
    expect(presenceService.isOnline(userId)).toBe(false);
  });

  test("getOnlineUsersForCase filters only online participants", () => {
    const user1Id = generateId();
    const user2Id = generateId();
    const user3Id = generateId();

    presenceService.addUser(user1Id, "s_a");
    presenceService.addUser(user3Id, "s_b");

    const participants = [
      { _id: user1Id, name: "Alice" },
      { _id: user2Id, name: "Bob" },
      { _id: user3Id, name: "Charlie" },
    ];

    const onlineUsers = presenceService.getOnlineUsersForCase(participants);

    expect(onlineUsers).toHaveLength(2);
    expect(onlineUsers.map((u) => u._id.toString())).toEqual(
      expect.arrayContaining([user1Id, user3Id])
    );
  });
});
