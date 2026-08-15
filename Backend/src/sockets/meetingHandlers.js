const Case = require("../models/Case");
const Message = require("../models/Message");
const meetingService = require("../services/meeting.service");
const presenceService = require("../services/presence.service");
const notificationService = require("../services/notification.service");

const getMeetingRoom = (caseId) => `meeting_${caseId}`;
const getCaseRoom = (caseId) => `case_${caseId}`;

/**
 * Get user role in case. Returns "Admin" | "Editor" | "Observer" | null.
 */
const getUserRole = (caseDoc, userId) => {
  if (caseDoc && typeof caseDoc.getParticipantRole === "function") {
    return caseDoc.getParticipantRole(userId);
  }
  return null;
};

/**
 * Check if user is participant in case.
 */
const isParticipant = (caseDoc, userId) => {
  if (caseDoc && typeof caseDoc.isParticipant === "function") {
    return caseDoc.isParticipant(userId);
  }
  return false;
};

/**
 * Get list of active participants with user info for a meeting.
 */
const getActiveParticipantsList = async (io, caseId) => {
  const room = getMeetingRoom(caseId);
  const sockets = await io.in(room).fetchSockets();
  return sockets.map((s) => ({
    userId: s.user._id.toString(),
    name: s.user.name,
    profilePictureUrl: s.user.profilePictureUrl || null,
  }));
};

// ─── Join Meeting ─────────────────────────────────────────────────────────────

const handleMeetingJoin =
  (io, socket) =>
  async ({ caseId }) => {
    try {
      if (!caseId) {
        return socket.emit("meeting:error", { message: "caseId is required" });
      }

      const caseDoc = await Case.findById(caseId);
      if (!caseDoc) {
        return socket.emit("meeting:error", { message: "Case not found" });
      }

      if (!isParticipant(caseDoc, socket.user._id)) {
        return socket.emit("meeting:error", {
          message: "You are not a participant of this case",
        });
      }

      const role = getUserRole(caseDoc, socket.user._id);

      // Check if active meeting exists
      const existingMeeting = await meetingService.getActiveMeeting(caseId);

      // Observers cannot start meetings
      if (!existingMeeting && role === "Observer") {
        return socket.emit("meeting:error", {
          message: "Only Admin or Editor can start a meeting",
        });
      }

      // Check if meeting is locked
      if (existingMeeting && existingMeeting.isLocked) {
        const isAlreadyParticipant = existingMeeting.participants.some(
          (p) => p.user.toString() === socket.user._id.toString() && !p.leftAt,
        );
        if (!isAlreadyParticipant) {
          return socket.emit("meeting:error", {
            message: "Meeting is locked by host",
          });
        }
      }

      // Atomic find-or-create (prevents duplicate meetings)
      const meeting = await meetingService.findOrCreateMeeting(
        caseId,
        socket.user._id,
      );

      // If new meeting was created, broadcast a chat message into the case chat
      if (!existingMeeting) {
        try {
          const savedMessage = await Message.create({
            caseId,
            senderId: socket.user._id,
            type: "meeting_started",
            content: "started a video meeting",
          });

          const populatedMessage = await Message.findById(savedMessage._id).populate(
            "senderId",
            "name email profilePictureUrl employeeId",
          );

          const caseRoomName = getCaseRoom(caseId);
          io.to(caseRoomName).emit("new_message", populatedMessage);
          console.log(`[Meeting] Broadcast meeting_started chat message to ${caseRoomName}`);

          // Send in-app notification to other case participants
          if (caseDoc.participants && caseDoc.participants.length > 0) {
            for (const p of caseDoc.participants) {
              const pUserId = (p.user?._id || p.user || p).toString();
              if (pUserId !== socket.user._id.toString()) {
                notificationService
                  .createNotification(
                    {
                      recipientId: pUserId,
                      actorId: socket.user._id,
                      type: "meeting_started",
                      title: "Video Meeting Started",
                      message: `${socket.user.name} started a video meeting in case "${caseDoc.title}"`,
                      caseId,
                    },
                    io,
                  )
                  .catch(console.error);
              }
            }
          }
        } catch (msgErr) {
          console.error("[Meeting] Failed to create meeting chat message / notification:", msgErr);
        }
      }

      // Add participant to meeting doc
      await meetingService.addParticipant(meeting._id, socket.user._id);

      // Join socket room
      const room = getMeetingRoom(caseId);
      await socket.join(room);

      // Track which meeting this socket is in (for disconnect cleanup)
      socket.meetingCaseId = caseId.toString();

      // Get list of existing participants in room (before this user)
      const existingParticipants = await getActiveParticipantsList(io, caseId);

      // Notify the joining user
      socket.emit("meeting:joined", {
        meetingId: meeting._id,
        caseId,
        role,
        participants: existingParticipants.filter(
          (p) => p.userId !== socket.user._id.toString(),
        ),
      });

      // Notify others in the room
      socket.to(room).emit("meeting:user-joined", {
        userId: socket.user._id.toString(),
        name: socket.user.name,
        profilePictureUrl: socket.user.profilePictureUrl || null,
      });

      console.log(
        `[Meeting] ${socket.user.name} joined meeting in case ${caseId} (role: ${role})`,
      );
    } catch (error) {
      console.error("[Meeting] Join error:", error);
      socket.emit("meeting:error", {
        message: error.message || "Failed to join meeting",
      });
    }
  };

// ─── WebRTC Signaling Relay ───────────────────────────────────────────────────

const handleMeetingOffer =
  (io, socket) =>
  async ({ targetUserId, signal }) => {
    if (!targetUserId || !signal) return;

    const targetSockets = await io.fetchSockets();
    const target = targetSockets.find(
      (s) => s.user._id.toString() === targetUserId,
    );

    if (target) {
      target.emit("meeting:offer", {
        fromUserId: socket.user._id.toString(),
        signal,
      });
    }
  };

const handleMeetingAnswer =
  (io, socket) =>
  async ({ targetUserId, signal }) => {
    if (!targetUserId || !signal) return;

    const targetSockets = await io.fetchSockets();
    const target = targetSockets.find(
      (s) => s.user._id.toString() === targetUserId,
    );

    if (target) {
      target.emit("meeting:answer", {
        fromUserId: socket.user._id.toString(),
        signal,
      });
    }
  };

const handleMeetingIceCandidate =
  (io, socket) =>
  async ({ targetUserId, candidate }) => {
    if (!targetUserId || !candidate) return;

    const targetSockets = await io.fetchSockets();
    const target = targetSockets.find(
      (s) => s.user._id.toString() === targetUserId,
    );

    if (target) {
      target.emit("meeting:ice-candidate", {
        fromUserId: socket.user._id.toString(),
        candidate,
      });
    }
  };

// ─── Media State ──────────────────────────────────────────────────────────────

const handleToggleMedia =
  (socket) =>
  ({ caseId, mediaState }) => {
    if (!caseId || !mediaState) return;

    const room = getMeetingRoom(caseId);
    if (!socket.rooms.has(room)) return;

    socket.to(room).emit("meeting:media-state", {
      userId: socket.user._id.toString(),
      mediaState,
    });
  };

// ─── Screen Share ─────────────────────────────────────────────────────────────

const handleScreenShareStarted =
  (socket) =>
  async ({ caseId }) => {
    if (!caseId) return;

    const room = getMeetingRoom(caseId);
    if (!socket.rooms.has(room)) return;

    // Check role — Observers cannot screen share
    const caseDoc = await Case.findById(caseId);
    if (caseDoc) {
      const role = getUserRole(caseDoc, socket.user._id);
      if (role === "Observer") {
        return socket.emit("meeting:error", {
          message: "Observers cannot share screen",
        });
      }
    }

    socket.to(room).emit("meeting:screen-share-started", {
      userId: socket.user._id.toString(),
    });
  };

const handleScreenShareStopped =
  (socket) =>
  ({ caseId }) => {
    if (!caseId) return;

    const room = getMeetingRoom(caseId);
    if (!socket.rooms.has(room)) return;

    socket.to(room).emit("meeting:screen-share-stopped", {
      userId: socket.user._id.toString(),
    });
  };

// ─── Leave Meeting ────────────────────────────────────────────────────────────

const handleMeetingLeave =
  (io, socket) =>
  async ({ caseId }) => {
    await cleanupMeetingParticipant(io, socket, caseId);
  };

/**
 * Shared cleanup for both explicit leave and disconnect.
 */
const cleanupMeetingParticipant = async (io, socket, caseId) => {
  if (!caseId) return;

  try {
    const room = getMeetingRoom(caseId);

    // Get active meeting
    const meeting = await meetingService.getActiveMeeting(caseId);
    if (!meeting) return;

    // Remove participant from meeting doc
    await meetingService.removeParticipant(meeting._id, socket.user._id);

    // Leave socket room
    await socket.leave(room);

    // Clear tracking
    socket.meetingCaseId = null;

    // Notify others
    socket.to(room).emit("meeting:user-left", {
      userId: socket.user._id.toString(),
    });

    // Check if meeting should end (no active participants)
    const activeCount = meetingService.getActiveParticipantCount(meeting);
    // Reload to get accurate count after removal
    const updatedMeeting = await meetingService.getActiveMeeting(caseId);
    if (updatedMeeting) {
      const remaining =
        meetingService.getActiveParticipantCount(updatedMeeting);

      if (remaining <= 0) {
        await meetingService.endMeeting(updatedMeeting._id);
        io.to(room).emit("meeting:ended", { caseId });
        console.log(`[Meeting] Meeting ended in case ${caseId} (last participant left)`);
      }
    }

    console.log(
      `[Meeting] ${socket.user.name} left meeting in case ${caseId}`,
    );
  } catch (error) {
    console.error("[Meeting] Leave/cleanup error:", error);
  }
};

const handleRaiseHand = (socket) => ({ caseId, isHandRaised }) => {
  if (!caseId) return;
  const room = getMeetingRoom(caseId);
  socket.to(room).emit("meeting:user-hand-raised", {
    userId: socket.user._id.toString(),
    isHandRaised,
  });
};

const handleHostMuteAll = (io, socket) => async ({ caseId }) => {
  if (!caseId) return;
  const caseDoc = await Case.findById(caseId);
  const role = getUserRole(caseDoc, socket.user._id);
  if (role !== "Admin" && role !== "Editor") return;
  const room = getMeetingRoom(caseId);
  socket.to(room).emit("meeting:force-mute");
};

const handleHostRemoveUser = (io, socket) => async ({ caseId, targetUserId }) => {
  if (!caseId || !targetUserId) return;
  const caseDoc = await Case.findById(caseId);
  const role = getUserRole(caseDoc, socket.user._id);
  if (role !== "Admin" && role !== "Editor") return;
  const room = getMeetingRoom(caseId);
  io.to(room).emit("meeting:user-kicked", { targetUserId, removedBy: socket.user.name });
};

const handleLockToggle = (io, socket) => async ({ caseId }) => {
  if (!caseId) return;
  const caseDoc = await Case.findById(caseId);
  const role = getUserRole(caseDoc, socket.user._id);
  if (role !== "Admin" && role !== "Editor") return;
  const meeting = await meetingService.getActiveMeeting(caseId);
  if (!meeting) return;
  const updated = await meetingService.toggleLockMeeting(meeting._id);
  const room = getMeetingRoom(caseId);
  io.to(room).emit("meeting:lock-changed", { isLocked: updated.isLocked });
};

// ─── Real-Time Speech-to-Text Transcript Handler ─────────────────────────────

const handleMeetingTranscriptChunk =
  (io, socket) =>
  async ({ caseId, text, isFinal = true }) => {
    try {
      if (!caseId || !text || !String(text).trim()) return;
      if (!socket.user || !socket.user._id) return;

      const cleanText = String(text).trim();
      if (cleanText.length > 2000) return; // Prevent excessive chunk payloads

      // 1. Verify case exists and user is an authorized participant
      const caseDoc = await Case.findById(caseId);
      if (!caseDoc || !isParticipant(caseDoc, socket.user._id)) {
        return socket.emit("meeting:error", {
          message: "You are not an authorized participant in this case",
        });
      }

      // 2. Verify active meeting exists for this case
      const activeMeeting = await meetingService.getActiveMeeting(caseId);
      if (!activeMeeting) {
        return socket.emit("meeting:error", {
          message: "No active meeting found for this case",
        });
      }

      // 3. Verify user is currently an active, un-left participant in this meeting
      const isMeetingParticipant = activeMeeting.participants.some(
        (p) =>
          p.user &&
          (p.user._id || p.user).toString() === socket.user._id.toString() &&
          !p.leftAt,
      );

      if (!isMeetingParticipant) {
        return socket.emit("meeting:error", {
          message: "You are not an active participant in this meeting",
        });
      }

      const now = new Date();

      // 4. Atomically persist chunk to DB only when phrase is finalized
      if (isFinal) {
        await meetingService.appendTranscriptChunk(
          caseId,
          activeMeeting._id,
          socket.user._id,
          socket.user.name,
          cleanText,
          now,
        );
      }

      // 5. Broadcast transcript chunk to all participants in the meeting room
      const room = getMeetingRoom(caseId);
      io.to(room).emit("meeting:transcript-chunk", {
        userId: socket.user._id.toString(),
        senderName: socket.user.name,
        text: cleanText,
        timestamp: now.toISOString(),
        isFinal: Boolean(isFinal),
      });
    } catch (err) {
      console.error("[Meeting] Error handling transcript chunk:", err);
    }
  };

// ─── Disconnect Handler ──────────────────────────────────────────────────────

/**
 * Called from socketHandlers disconnect to clean up meeting state.
 */
const handleMeetingDisconnect = async (io, socket) => {
  if (socket.meetingCaseId) {
    await cleanupMeetingParticipant(io, socket, socket.meetingCaseId);
  }
};

// ─── Register All Meeting Handlers ────────────────────────────────────────────

const registerMeetingHandlers = (io, socket) => {
  socket.on("meeting:join", handleMeetingJoin(io, socket));
  socket.on("meeting:offer", handleMeetingOffer(io, socket));
  socket.on("meeting:answer", handleMeetingAnswer(io, socket));
  socket.on("meeting:ice-candidate", handleMeetingIceCandidate(io, socket));
  socket.on("meeting:toggle-media", handleToggleMedia(socket));
  socket.on("meeting:screen-share-started", handleScreenShareStarted(socket));
  socket.on("meeting:screen-share-stopped", handleScreenShareStopped(socket));
  socket.on("meeting:raise-hand", handleRaiseHand(socket));
  socket.on("meeting:host-mute-all", handleHostMuteAll(io, socket));
  socket.on("meeting:host-remove-user", handleHostRemoveUser(io, socket));
  socket.on("meeting:lock-toggle", handleLockToggle(io, socket));
  socket.on("meeting:transcript-chunk", handleMeetingTranscriptChunk(io, socket));
  socket.on("meeting:leave", handleMeetingLeave(io, socket));
};

module.exports = { registerMeetingHandlers, handleMeetingDisconnect };
