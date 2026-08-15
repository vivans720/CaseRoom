const Meeting = require("../models/Meeting");
const { enqueue } = require("./ai/indexing.service");

/**
 * Atomically find or create an active meeting for a case.
 * Two simultaneous calls get the same document — no race condition.
 */
const findOrCreateMeeting = async (caseId, userId) => {
  const meeting = await Meeting.findOneAndUpdate(
    { caseId, status: "active" },
    {
      $setOnInsert: {
        caseId,
        startedBy: userId,
        startedAt: new Date(),
        status: "active",
        participants: [],
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  return meeting;
};

/**
 * Get the active meeting for a case, or null.
 */
const getActiveMeeting = async (caseId) => {
  return Meeting.findOne({ caseId, status: "active" }).populate(
    "participants.user",
    "name email profilePictureUrl",
  );
};

/**
 * Add a participant to the meeting.
 * If user already present and hasn't left, skip.
 * If user previously left, add a new entry (rejoin).
 */
const addParticipant = async (meetingId, userId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) return null;

  // Check if already in meeting and hasn't left
  const existing = meeting.participants.find(
    (p) => p.user.toString() === userId.toString() && !p.leftAt,
  );
  if (existing) return meeting;

  meeting.participants.push({
    user: userId,
    joinedAt: new Date(),
    leftAt: null,
  });

  await meeting.save();
  return meeting;
};

/**
 * Mark a participant as left.
 */
const removeParticipant = async (meetingId, userId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) return null;

  const participant = meeting.participants.find(
    (p) => p.user.toString() === userId.toString() && !p.leftAt,
  );

  if (participant) {
    participant.leftAt = new Date();
    await meeting.save();
  }

  return meeting;
};

/**
 * Count participants who haven't left yet.
 */
const getActiveParticipantCount = (meeting) => {
  if (!meeting || !meeting.participants) return 0;
  return meeting.participants.filter((p) => !p.leftAt).length;
};

/**
 * End a meeting and auto-enqueue AI RAG vector indexing if transcript exists.
 */
const endMeeting = async (meetingId) => {
  const meeting = await Meeting.findByIdAndUpdate(
    meetingId,
    {
      status: "ended",
      endedAt: new Date(),
    },
    { returnDocument: "after" },
  );

  if (
    meeting &&
    ((meeting.transcript && meeting.transcript.trim().length > 0) ||
      (meeting.transcriptEntries && meeting.transcriptEntries.length > 0))
  ) {
    try {
      await enqueue({
        caseId: meeting.caseId,
        sourceType: "meeting",
        sourceId: meeting._id,
        action: "upsert",
      });
    } catch (error) {
      console.warn("[AI indexing] Could not queue meeting on end:", error.message);
    }
  }

  return meeting;
};

/**
 * Append a real-time transcript chunk to structured entries and sync transcript text.
 */
const appendTranscriptChunk = async (caseId, meetingId, userId, senderName, text, timestamp = new Date()) => {
  const meeting = await Meeting.findOne({ _id: meetingId, caseId, status: "active" });
  if (!meeting) return null;

  const dateObj = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  const seconds = String(dateObj.getSeconds()).padStart(2, "0");
  const timeStr = `${hours}:${minutes}:${seconds}`;

  const cleanText = String(text || "").trim();
  if (!cleanText) return { meeting, entry: null };

  const cleanName = String(senderName || "Participant").trim();

  const entry = {
    userId,
    senderName: cleanName,
    text: cleanText,
    timestamp: dateObj,
  };

  if (!Array.isArray(meeting.transcriptEntries)) {
    meeting.transcriptEntries = [];
  }
  meeting.transcriptEntries.push(entry);

  const formattedLine = `${cleanName} (${timeStr}): ${cleanText}`;
  meeting.transcript = meeting.transcript ? `${meeting.transcript}\n${formattedLine}` : formattedLine;

  await meeting.save();
  return { meeting, entry, formattedLine };
};

/**
 * Toggle meeting lock status.
 */
const toggleLockMeeting = async (meetingId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) return null;
  meeting.isLocked = !meeting.isLocked;
  await meeting.save();
  return meeting;
};

/**
 * Get meeting history for a case.
 */
const getMeetingHistory = async (caseId, limit = 20) => {
  return Meeting.find({ caseId, status: "ended" })
    .sort({ endedAt: -1 })
    .limit(limit)
    .populate("startedBy", "name email profilePictureUrl")
    .populate("participants.user", "name email profilePictureUrl")
    .lean();
};

const updateTranscript = async (caseId, meetingId, userId, transcript) => {
  const Case = require("../models/Case");
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) throw Object.assign(new Error("Case not found"), { statusCode: 404 });
  if (!caseDoc.isParticipant(userId)) throw Object.assign(new Error("Access denied. You are not a participant in this case"), { statusCode: 403 });
  const meeting = await Meeting.findOne({ _id: meetingId, caseId });
  if (!meeting) throw Object.assign(new Error("Meeting not found"), { statusCode: 404 });
  meeting.transcript = String(transcript || "").trim();
  await meeting.save();
  enqueue({ caseId, sourceType: "meeting", sourceId: meeting._id }).catch((error) => console.warn("[AI indexing] Could not queue meeting:", error.message));
  return meeting;
};

module.exports = {
  findOrCreateMeeting,
  getActiveMeeting,
  addParticipant,
  removeParticipant,
  getActiveParticipantCount,
  endMeeting,
  appendTranscriptChunk,
  toggleLockMeeting,
  getMeetingHistory,
  updateTranscript,
};
