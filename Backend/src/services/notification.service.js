const Notification = require("../models/Notification");

// Helper to throw errors safely
const throwError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

/**
 * Creates a notification and emits a socket event if an io instance is provided
 */
const createNotification = async (notificationData, io = null) => {
  const notification = new Notification(notificationData);
  await notification.save();

  // Optionally emit real-time event directly into the targeted user's personal room
  if (io) {
    io.to(`user_${notification.recipientId.toString()}`).emit(
      "new_notification",
      notification
    );
  }

  return notification;
};

/**
 * Gets a paginated list of notifications for a user
 */
const getUserNotifications = async (userId, limit = 20, skip = 0) => {
  const notifications = await Notification.find({ recipientId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("actorId", "name email")
    .populate("caseId", "title")
    .lean();

  return notifications;
};

/**
 * Gets the count of unread notifications for a user
 */
const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({
    recipientId: userId,
    isRead: false,
  });
  
  return { count };
};

/**
 * Marks a single notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    throwError("Notification not found", 404);
  }

  // Ensure the user actually owns the notification before updating
  if (notification.recipientId.toString() !== userId.toString()) {
    throwError("Access denied", 403);
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

/**
 * Marks all unread notifications for a user as read
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return {
    message: "All notifications marked as read",
    modifiedCount: result.modifiedCount,
  };
};

/**
 * Deletes a specific notification
 */
const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    throwError("Notification not found", 404);
  }

  // Ensure the user actually owns the notification before deleting
  if (notification.recipientId.toString() !== userId.toString()) {
    throwError("Access denied", 403);
  }

  await notification.deleteOne();
  return { message: "Notification deleted successfully" };
};

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
