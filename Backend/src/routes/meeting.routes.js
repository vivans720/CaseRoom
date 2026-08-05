const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getActiveMeeting } = require("../controllers/meeting.controller");

const router = express.Router({ mergeParams: true });

// GET /api/v1/cases/:caseId/meeting/active
router.get("/:caseId/meeting/active", protect, getActiveMeeting);

module.exports = router;
