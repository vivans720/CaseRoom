const Meeting = require("../models/Meeting");

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
    { upsert: true, new: true },
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
 * End a meeting.
 */
const endMeeting = async (meetingId) => {
  return Meeting.findByIdAndUpdate(
    meetingId,
    {
      status: "ended",
      endedAt: new Date(),
    },
    { new: true },
  );
};

module.exports = {
  findOrCreateMeeting,
  getActiveMeeting,
  addParticipant,
  removeParticipant,
  getActiveParticipantCount,
  endMeeting,
};
