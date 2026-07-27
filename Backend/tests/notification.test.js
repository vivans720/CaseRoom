const request = require("supertest");
const app = require("../src/app");
const { createTestUser, getAuthHeader } = require("./helpers/authHelper");
const Notification = require("../src/models/Notification");

describe("Notification API", () => {
  let user1Token, user1;
  let user2Token, user2;
  let notification1, notification2, readNotification;

  beforeEach(async () => {
    // Setup users
    const u1 = await createTestUser(app, {
      employeeId: "USER1",
      email: "user1@test.com",
      phone: "1111111111",
      password: "Password123"
    });
    user1Token = u1.token;
    user1 = u1.user;

    const u2 = await createTestUser(app, {
      employeeId: "USER2",
      email: "user2@test.com",
      phone: "2222222222",
      password: "Password123"
    });
    user2Token = u2.token;
    user2 = u2.user;

    // Seed direct DB notifications for user1
    notification1 = await Notification.create({
      recipientId: user1._id,
      type: "added_to_case",
      title: "Case Add",
      body: "Added to case 1",
    });

    notification2 = await Notification.create({
      recipientId: user1._id,
      type: "new_message",
      title: "New Msg",
      body: "You have a msg",
    });

    readNotification = await Notification.create({
      recipientId: user1._id,
      type: "case_archived",
      title: "Case Arch",
      body: "Case archived",
      isRead: true,
      readAt: new Date(),
    });
    
    // Seed notification for user2
    await Notification.create({
      recipientId: user2._id,
      type: "case_archived",
      title: "Case Arch 2",
      body: "Case archived",
    });
  });

  describe("GET /api/v1/notifications", () => {
    it("should get notifications with valid token", async () => {
      const response = await request(app)
        .get("/api/v1/notifications")
        .set(getAuthHeader(user1Token));

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(3); // User 1 has 3 notifications
    });

    it("should fail without token", async () => {
      const response = await request(app).get("/api/v1/notifications");
      expect(response.status).toBe(401);
    });

    it("should get notifications with pagination limits", async () => {
      const response = await request(app)
        .get("/api/v1/notifications?limit=2&skip=0")
        .set(getAuthHeader(user1Token));

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });
  });

  describe("GET /api/v1/notifications/unread-count", () => {
    it("should get correct unread count", async () => {
      const response = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set(getAuthHeader(user1Token));

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(2); // user1 has 2 unread, 1 read
    });

    it("should get 0 count when all read or user has no unread", async () => {
      // Mark user2's only notification as read
      await Notification.updateMany({ recipientId: user2._id }, { isRead: true });

      const response = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set(getAuthHeader(user2Token));

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(0);
    });
  });

  describe("PUT /api/v1/notifications/:id/read", () => {
    it("should mark own unread notification as read", async () => {
      const response = await request(app)
        .put(`/api/v1/notifications/${notification1._id}/read`)
        .set(getAuthHeader(user1Token));

      expect(response.status).toBe(200);
      expect(response.body.data.isRead).toBe(true);
      expect(response.body.data.readAt).not.toBeNull();
    });

    it("should return identical if marking already read notification", async () => {
      const response = await request(app)
        .put(`/api/v1/notifications/${readNotification._id}/read`)
        .set(getAuthHeader(user1Token));

      expect(response.status).toBe(200);
      expect(response.body.data.isRead).toBe(true);
    });

    it("should fail to mark someone else's notification as read", async () => {
      const response = await request(app)
        .put(`/api/v1/notifications/${notification1._id}/read`)
        .set(getAuthHeader(user2Token));

      expect(response.status).toBe(403);
    });

    it("should fail with non-existent notification", async () => {
      const fakeId = "60c72b2f9b1d8b001c8e4a9e";
      const response = await request(app)
        .put(`/api/v1/notifications/${fakeId}/read`)
        .set(getAuthHeader(user1Token));

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/v1/notifications/mark-all-read", () => {
    it("should mark all user notifications as read", async () => {
      const response = await request(app)
        .put("/api/v1/notifications/mark-all-read")
        .set(getAuthHeader(user1Token));

      expect(response.status).toBe(200);
      expect(response.body.data.modifiedCount).toBe(2);

      const countRes = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set(getAuthHeader(user1Token));
      expect(countRes.body.data.count).toBe(0);
    });

    it("should not modify other users' notifications", async () => {
      await request(app)
        .put("/api/v1/notifications/mark-all-read")
        .set(getAuthHeader(user1Token));

      const countRes2 = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set(getAuthHeader(user2Token));
      expect(countRes2.body.data.count).toBe(1); // User 2's unread is preserved
    });
  });

  describe("DELETE /api/v1/notifications/:id", () => {
    it("should delete own notification", async () => {
      const response = await request(app)
        .delete(`/api/v1/notifications/${notification1._id}`)
        .set(getAuthHeader(user1Token));

      expect(response.status).toBe(200);
      expect(response.body.data.message).toBe("Notification deleted successfully");

      const checkDb = await Notification.findById(notification1._id);
      expect(checkDb).toBeNull();
    });

    it("should fail to delete someone else's notification", async () => {
      const response = await request(app)
        .delete(`/api/v1/notifications/${notification1._id}`)
        .set(getAuthHeader(user2Token));

      expect(response.status).toBe(403);
    });

    it("should fail with non-existent notification", async () => {
      const fakeId = "60c72b2f9b1d8b001c8e4a9e";
      const response = await request(app)
        .delete(`/api/v1/notifications/${fakeId}`)
        .set(getAuthHeader(user1Token));

      expect(response.status).toBe(404);
    });
  });
});
