const Case = require("../models/Case");
const User = require("../models/User");
const {
  createMessage,
  resolveMentionedUserIds,
  markMessagesAsRead,
  deleteMessage,
  editMessage,
  toggleReaction,
} = require("../services/message.service");
const { createNotification } = require("../services/notification.service");
const presenceService = require("../services/presence.service");
const caseService = require("../services/case.service");
//build room name for a given case

const getRoomName = (caseId) => `case_${caseId}`;

//Fetch a case by ID from database

const findCaseById = async (caseId) => {
  const foundCase = await Case.findById(caseId);
  return foundCase;
};

// check if a user is participant in a case

const isParticipant = (foundCase, userId) => {
  if (foundCase && typeof foundCase.isParticipant === "function") {
    return foundCase.isParticipant(userId);
  }
  return (
    foundCase &&
    foundCase.participants &&
    foundCase.participants.some((p) => {
      const pid = p.user ? p.user.toString() : p.toString();
      return pid === userId.toString();
    })
  );
};

//join case event

const handleJoinCase =
  (socket) =>
  async ({ caseId }) => {
    try {
      if (!caseId) {
        return socket.emit("error", { message: "caseId is required" });
      }

      const foundCase = await findCaseById(caseId);

      if (!foundCase) {
        return socket.emit("error", { message: "Case not found" });
      }

      if (foundCase.status === "archived" || foundCase.status === "Closed") {
        return socket.emit("error", { message: "Case is not active" });
      }

      if (!isParticipant(foundCase, socket.user._id)) {
        return socket.emit("error", {
          message: "You are not a participant of this case",
        });
      }

      await socket.join(getRoomName(caseId));
      socket.emit("joined_case", {
        message: `Joined case ${caseId}`,
        caseId,
      });
    } catch (error) {
      socket.emit("error", { message: "Failed to join case" });
    }
  };

//leave case
const handleLeaveCase =
  (socket) =>
  async ({ caseId }) => {
    try {
      if (!caseId) {
        return socket.emit("error", { message: "caseId is required" });
      }

      const roomName = getRoomName(caseId);

      if (!socket.rooms.has(roomName)) {
        return socket.emit("info", {
          message: `You are not in case ${caseId}`,
        });
      }

      await socket.leave(roomName);
      socket.emit("left_case", {
        message: `Left case ${caseId}`,
        caseId,
      });
    } catch (error) {
      socket.emit("error", { message: "Failed to leave case" });
    }
  };

//send message

const handleSendMessage =
  (io, socket) =>
  async ({ caseId, content, replyToId, mentionedUserIds }) => {
    try {
      if (!caseId || !content) {
        return socket.emit("error", {
          message: "caseId and content are required",
        });
      }

      const foundCase = await findCaseById(caseId);

      if (!foundCase) {
        return socket.emit("error", { message: "Case not found" });
      }

      if (foundCase.status === "archived") {
        return socket.emit("error", {
          message: "Cannot send messages to an archived case",
        });
      }

      if (!isParticipant(foundCase, socket.user._id)) {
        return socket.emit("error", {
          message: "You are not a participant of this case",
        });
      }

      if (
        typeof foundCase.getParticipantRole === "function" &&
        foundCase.getParticipantRole(socket.user._id) === "Observer"
      ) {
        return socket.emit("error", {
          message: "Forbidden: Observers are read-only and cannot send messages",
        });
      }

      const resolvedMentionedUserIds = resolveMentionedUserIds({
        caseDoc: foundCase,
        senderId: socket.user._id,
        mentionedUserIds,
      });

      const savedMessage = await createMessage({
        caseId,
        senderId: socket.user._id,
        content,
        replyToId,
        mentionedUserIds: resolvedMentionedUserIds,
      });

      const targetRoom = getRoomName(caseId);
      console.log(
        `[Socket] Broadcasting new_message to ${targetRoom}. Content: ${content.substring(0, 20)}...`,
      );
      io.to(targetRoom).emit("new_message", savedMessage);
      // Identify sockets currently in the room
      const activeSockets = await io.in(getRoomName(caseId)).fetchSockets();
      const activeUserIds = activeSockets.map((s) => s.user._id.toString());

      // Push targeted notifications to offline/absent participants
      const offlineParticipants = foundCase.participants
        .map((p) => {
          if (!p) return null;
          return p.user
            ? p.user._id
              ? p.user._id.toString()
              : p.user.toString()
            : p._id
              ? p._id.toString()
              : p.toString();
        })
        .filter(Boolean)
        .filter(
          (pid) =>
            pid !== socket.user._id.toString() &&
            !resolvedMentionedUserIds.includes(pid) &&
            !activeUserIds.includes(pid),
        );

      const notificationPromises = offlineParticipants.map((pid) =>
        createNotification(
          {
            recipientId: pid,
            type: "new_message",
            title: `New Message in ${foundCase.title}`,
            body: `You have a new message from ${socket.user.name}.`,
            caseId: foundCase._id,
            messageId: savedMessage._id,
            actorId: socket.user._id,
          },
          io,
        ),
      );

      const mentionNotificationPromises = resolvedMentionedUserIds.map((pid) =>
        createNotification(
          {
            recipientId: pid,
            type: "mentioned_in_message",
            title: `Mention in ${foundCase.title}`,
            body: `${socket.user.name} mentioned you in chat.`,
            caseId: foundCase._id,
            messageId: savedMessage._id,
            actorId: socket.user._id,
          },
          io,
        ),
      );

      await Promise.all([
        ...notificationPromises,
        ...mentionNotificationPromises,
      ]);
    } catch (error) {
      socket.emit("error", {
        message: error.message || "Failed to send message",
      });
    }
  };

// typing start event
const handleTypingStart =
  (socket) =>
  ({ caseId }) => {
    if (!caseId) return;

    const roomName = getRoomName(caseId);

    if (!socket.rooms.has(roomName)) return;

    socket.to(getRoomName(caseId)).emit("typing_start", {
      userId: socket.user._id,
      name: socket.user.name,
    });
  };

//typing stop event

const handleTypingStop =
  (socket) =>
  ({ caseId }) => {
    if (!caseId) return;

    const roomName = getRoomName(caseId);

    if (!socket.rooms.has(roomName)) return;

    socket.to(getRoomName(caseId)).emit("typing_stop", {
      userId: socket.user._id,
    });
  };

const handleDisconnect = (socket) => async () => {
  console.log(`User Disconnected: ${socket.user._id}`);
  const isLastConnection = presenceService.removeUser(
    socket.user._id,
    socket.id,
  );

  if (isLastConnection) {
    const lastSeen = new Date();
    try {
      await User.findByIdAndUpdate(socket.user._id, { lastSeen });

      const userCases = await caseService.getAllCases(socket.user._id);
      userCases.forEach((c) => {
        socket.to(getRoomName(c._id)).emit("user_offline", {
          userId: socket.user._id,
          caseId: c._id,
          lastSeen,
        });
      });
    } catch (err) {
      if (err.statusCode === 404 || err.message.includes("User not found")) {
        console.warn(
          `[Socket] Disconnect handle skipped: User ${socket.user._id} no longer in DB.`,
        );
      } else {
        console.error("Failed to handle user disconnect:", err);
      }
    }
  }
};

const handleMarkRead =
  (io, socket) =>
  async ({ caseId, messageIds }) => {
    if (
      !caseId ||
      !messageIds ||
      !Array.isArray(messageIds) ||
      messageIds.length === 0
    )
      return;

    try {
      const result = await markMessagesAsRead(
        socket.user._id,
        caseId,
        messageIds,
      );
      if (result.modifiedCount > 0) {
        io.to(getRoomName(caseId)).emit("message_read", {
          caseId,
          userId: socket.user._id,
          messageIds,
        });
      }
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

const handleGetOnlineUsers =
  (socket) =>
  async ({ caseId }) => {
    if (!caseId) return;

    try {
      const participants = await caseService.getParticipantsInternal(caseId);
      const onlineUsers = presenceService.getOnlineUsersForCase(participants);
      socket.emit("online_users", {
        caseId,
        onlineUsers: onlineUsers.map((u) => u._id),
      });
    } catch (error) {
      console.error("Failed to get online users:", error);
    }
  };

const handleDeleteMessage =
  (io, socket) =>
  async ({ caseId, messageId }) => {
    if (!caseId || !messageId) return;

    try {
      const deletedMessage = await deleteMessage(messageId, socket.user._id);

      io.to(getRoomName(caseId)).emit("message_deleted", {
        messageId,
        caseId,
        deletedBy: socket.user._id,
        deletedAt: deletedMessage.deletedAt,
      });
    } catch (error) {
      console.error("Failed to delete message:", error);
      socket.emit("error", {
        message: error.message || "Failed to delete message",
      });
    }
  };

const handleEditMessage =
  (io, socket) =>
  async ({ caseId, messageId, content }) => {
    if (!caseId || !messageId || typeof content !== "string") return;

    try {
      const foundCase = await findCaseById(caseId);

      if (!foundCase) {
        return socket.emit("error", { message: "Case not found" });
      }

      if (foundCase.status === "archived") {
        return socket.emit("error", {
          message: "Cannot edit messages in an archived case",
        });
      }

      if (!isParticipant(foundCase, socket.user._id)) {
        return socket.emit("error", {
          message: "You are not a participant of this case",
        });
      }

      const updatedMessage = await editMessage(
        messageId,
        socket.user._id,
        content,
      );

      if (updatedMessage.caseId.toString() !== caseId.toString()) {
        return socket.emit("error", {
          message: "Message does not belong to this case",
        });
      }

      io.to(getRoomName(caseId)).emit("message_edited", updatedMessage);
    } catch (error) {
      console.error("Failed to edit message:", error);
      socket.emit("error", {
        message: error.message || "Failed to edit message",
      });
    }
  };

const handleToggleReaction =
  (io, socket) =>
  async ({ caseId, messageId, emoji }) => {
    if (!caseId || !messageId || !emoji) return;

    try {
      const reactions = await toggleReaction(messageId, socket.user._id, emoji);
      io.to(getRoomName(caseId)).emit("reaction_updated", {
        caseId,
        messageId,
        reactions,
      });
    } catch (error) {
      console.error("Failed to update reaction:", error);
      socket.emit("error", {
        message: error.message || "Failed to update reaction",
      });
    }
  };

const handleAnnotationCreated = (io, socket) => ({ caseId, annotation }) => {
  if (!caseId || !annotation) return;
  socket.to(getRoomName(caseId)).emit("annotation:created", { caseId, annotation });
};

const handleAnnotationUpdated = (io, socket) => ({ caseId, annotation }) => {
  if (!caseId || !annotation) return;
  socket.to(getRoomName(caseId)).emit("annotation:updated", { caseId, annotation });
};

const handleAnnotationDeleted = (io, socket) => ({ caseId, annotationId, fileUrl }) => {
  if (!caseId || !annotationId) return;
  socket.to(getRoomName(caseId)).emit("annotation:deleted", { caseId, annotationId, fileUrl });
};

//register all socket event handlers

const registerSocketHandlers = (io, socket) => {
  socket.on("join_case", handleJoinCase(socket));
  socket.on("leave_case", handleLeaveCase(socket));
  socket.on("send_message", handleSendMessage(io, socket));
  socket.on("typing_start", handleTypingStart(socket));
  socket.on("typing_stop", handleTypingStop(socket));
  socket.on("mark_read", handleMarkRead(io, socket));
  socket.on("get_online_users", handleGetOnlineUsers(socket));
  socket.on("delete_message", handleDeleteMessage(io, socket));
  socket.on("edit_message", handleEditMessage(io, socket));
  socket.on("toggle_reaction", handleToggleReaction(io, socket));
  socket.on("annotation:create", handleAnnotationCreated(io, socket));
  socket.on("annotation:update", handleAnnotationUpdated(io, socket));
  socket.on("annotation:delete", handleAnnotationDeleted(io, socket));
  socket.on("disconnect", handleDisconnect(socket));
};

module.exports = registerSocketHandlers;
