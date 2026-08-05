const mongoose = require("mongoose");
const Meeting = require("../../../src/models/Meeting");
const meetingService = require("../../../src/services/meeting.service");

describe("Meeting Service Unit Tests", () => {
  const caseId = new mongoose.Types.ObjectId();
  const userId1 = new mongoose.Types.ObjectId();
  const userId2 = new mongoose.Types.ObjectId();

  it("findOrCreateMeeting creates single active meeting atomically", async () => {
    const m1 = await meetingService.findOrCreateMeeting(caseId, userId1);
    expect(m1.caseId.toString()).toBe(caseId.toString());
    expect(m1.startedBy.toString()).toBe(userId1.toString());
    expect(m1.status).toBe("active");

    // Second call returns same meeting
    const m2 = await meetingService.findOrCreateMeeting(caseId, userId2);
    expect(m2._id.toString()).toBe(m1._id.toString());
  });

  it("getActiveMeeting returns null when no active meeting exists", async () => {
    const active = await meetingService.getActiveMeeting(caseId);
    expect(active).toBeNull();
  });

  it("addParticipant and removeParticipant update subdocuments correctly", async () => {
    const meeting = await meetingService.findOrCreateMeeting(caseId, userId1);
    await meetingService.addParticipant(meeting._id, userId1);
    await meetingService.addParticipant(meeting._id, userId2);

    let active = await meetingService.getActiveMeeting(caseId);
    expect(meetingService.getActiveParticipantCount(active)).toBe(2);

    await meetingService.removeParticipant(meeting._id, userId1);
    active = await meetingService.getActiveMeeting(caseId);
    expect(meetingService.getActiveParticipantCount(active)).toBe(1);
  });

  it("endMeeting sets status to ended", async () => {
    const meeting = await meetingService.findOrCreateMeeting(caseId, userId1);
    const ended = await meetingService.endMeeting(meeting._id);
    expect(ended.status).toBe("ended");
    expect(ended.endedAt).toBeDefined();

    const active = await meetingService.getActiveMeeting(caseId);
    expect(active).toBeNull();
  });
});
