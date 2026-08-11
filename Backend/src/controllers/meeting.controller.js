const meetingService = require("../services/meeting.service");

const getActiveMeeting = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    const meeting = await meetingService.getActiveMeeting(caseId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "No active meeting for this case",
      });
    }

    const activeCount = meetingService.getActiveParticipantCount(meeting);

    res.status(200).json({
      success: true,
      data: {
        meetingId: meeting._id,
        caseId: meeting.caseId,
        startedBy: meeting.startedBy,
        startedAt: meeting.startedAt,
        activeParticipants: activeCount,
        participants: meeting.participants.filter((p) => !p.leftAt),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMeetingHistory = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const history = await meetingService.getMeetingHistory(caseId);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

const updateTranscript = async (req, res, next) => {
  try {
    const meeting = await meetingService.updateTranscript(req.params.caseId, req.params.meetingId, req.user._id, req.body.transcript);
    res.json({ success: true, data: meeting });
  } catch (error) { next(error); }
};

module.exports = { getActiveMeeting, getMeetingHistory, updateTranscript };
