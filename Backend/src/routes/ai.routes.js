const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const aiController = require("../controllers/ai.controller");

const router = express.Router();

// All AI routes require authentication
router.use(protect);

// Phase 1 — Summaries
router.post("/chat-summary", aiController.getChatSummary);
router.post("/meeting-summary", aiController.getMeetingSummary);

// Phase 2 — Embeddings, Similar Cases, Duplicates, Semantic Search
router.get("/search", aiController.searchCases);
router.get("/similar-cases/:caseId", aiController.getSimilarCases);
router.post("/duplicate-check", aiController.checkDuplicate);

// Phase 3 — Participant Recommendation
router.get("/recommend-participants/:caseId", aiController.getParticipantRecommendations);

// Phase 4 — Timeline Generation
router.post("/timeline", aiController.getTimeline);

// Phase 5 — Action Item Extraction
router.post("/extract-tasks", aiController.extractTasks);

router.post("/case-assistant", aiController.askCaseAssistant);
router.post("/document-qa", aiController.askDocument);
router.post("/knowledge-assistant", aiController.askKnowledge);
router.get("/conversations", aiController.listConversations);
router.get("/conversations/:conversationId", aiController.getConversation);
router.patch("/conversations/:conversationId", aiController.updateConversation);
router.delete("/conversations/:conversationId", aiController.deleteConversation);
router.post("/index/backfill", aiController.backfillCase);
router.get("/index/jobs/:jobId", aiController.getIndexJob);
router.post("/contradictions", aiController.scanContradictions);
router.get("/contradictions/:caseId", aiController.listInsights);
router.patch("/insights/:insightId", aiController.updateInsight);

module.exports = router;
