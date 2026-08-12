const summaryService = require("../services/ai/summary.service");
const embeddingService = require("../services/ai/embedding.service");
const searchService = require("../services/ai/search.service");
const timelineService = require("../services/ai/timeline.service");
const taskExtractionService = require("../services/ai/taskExtraction.service");
const ragService = require("../services/ai/rag.service");
const indexingService = require("../services/ai/indexing.service");
const AIIndexJob = require("../models/AIIndexJob");
const AIConversation = require("../models/AIConversation");
const AIInsight = require("../models/AIInsight");
const Case = require("../models/Case");

const requireCaseAdmin = async (caseId, userId) => {
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) throw Object.assign(new Error("Case not found"), { statusCode: 404 });
  if (caseDoc.getParticipantRole(userId) !== "Admin") throw Object.assign(new Error("Only case Admins may run this action"), { statusCode: 403 });
  return caseDoc;
};

/**
 * Summarize case chat messages
 * POST /api/v1/ai/chat-summary
 */
const getChatSummary = async (req, res, next) => {
  try {
    const { caseId } = req.body;
    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId is required" });
    }

    const summary = await summaryService.summarizeChat(caseId, req.user._id);
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Summarize meeting notes or transcript
 * POST /api/v1/ai/meeting-summary
 */
const getMeetingSummary = async (req, res, next) => {
  try {
    const { caseId, meetingId, transcript } = req.body;
    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId is required" });
    }

    const summary = await summaryService.summarizeMeeting(caseId, meetingId, req.user._id, transcript);
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * AI Semantic Search across cases
 * GET /api/v1/ai/search?q=...
 */
const searchCases = async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: "Search query 'q' is required" });
    }

    const cases = await searchService.semanticSearch(q, req.user._id, parseInt(limit, 10) || 15);
    return res.status(200).json({
      success: true,
      data: cases,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top 5 similar cases for a given caseId
 * GET /api/v1/ai/similar-cases/:caseId
 */
const getSimilarCases = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { limit } = req.query;
    const cases = await embeddingService.findSimilarCases(caseId, parseInt(limit, 10) || 5);

    return res.status(200).json({
      success: true,
      data: cases,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if a new case is a duplicate (>95% similarity)
 * POST /api/v1/ai/duplicate-check
 */
const checkDuplicate = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const result = await embeddingService.checkDuplicateCase(title, description, req.user._id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate chronological investigation timeline
 * POST /api/v1/ai/timeline
 * Body: { caseId }
 */
const getTimeline = async (req, res, next) => {
  try {
    const { caseId } = req.body;
    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId is required" });
    }

    const timelineData = await timelineService.generateTimeline(caseId, req.user._id);
    return res.status(200).json({
      success: true,
      data: timelineData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Extract action items/tasks from case chat
 * POST /api/v1/ai/extract-tasks
 * Body: { caseId }
 */
const extractTasks = async (req, res, next) => {
  try {
    const { caseId } = req.body;
    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId is required" });
    }

    const taskData = await taskExtractionService.extractTasks(caseId, req.user._id);
    return res.status(200).json({
      success: true,
      data: taskData,
    });
  } catch (error) {
    next(error);
  }
};

const askCaseAssistant = async (req, res, next) => {
  try {
    const { caseId, question, conversationId } = req.body;
    const data = await ragService.answer({ userId: req.user._id, scope: "case", caseId, question, conversationId });
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

const askDocument = async (req, res, next) => {
  try {
    const { caseId, documentMessageId, question, conversationId } = req.body;
    const data = await ragService.answer({ userId: req.user._id, scope: "document", caseId, documentMessageId, question, conversationId });
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

const listConversations = async (req, res, next) => {
  try {
    const { scope, caseId } = req.query;
    const filter = { userId: req.user._id };
    if (scope) filter.scope = scope;
    if (caseId) filter.caseId = caseId;
    const data = await AIConversation.find(filter).select("scope caseId title updatedAt createdAt").sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const getConversation = async (req, res, next) => {
  try {
    const data = await AIConversation.findOne({ _id: req.params.conversationId, userId: req.user._id }).lean();
    if (!data) return res.status(404).json({ success: false, message: "Conversation not found" });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const updateConversation = async (req, res, next) => {
  try {
    const data = await AIConversation.findOneAndUpdate({ _id: req.params.conversationId, userId: req.user._id }, { title: String(req.body.title || "").trim() }, { returnDocument: "after" });
    if (!data) return res.status(404).json({ success: false, message: "Conversation not found" });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteConversation = async (req, res, next) => {
  try {
    const data = await AIConversation.findOneAndDelete({ _id: req.params.conversationId, userId: req.user._id });
    if (!data) return res.status(404).json({ success: false, message: "Conversation not found" });
    res.status(204).end();
  } catch (error) { next(error); }
};

const backfillCase = async (req, res, next) => {
  try {
    const { caseId } = req.body;
    await requireCaseAdmin(caseId, req.user._id);
    const Message = require("../models/Message");
    const Meeting = require("../models/Meeting");
    const [messages, meetings] = await Promise.all([
      Message.find({ caseId, isDeleted: false }).select("_id type content fileUrl").lean(),
      Meeting.find({ caseId, transcript: { $exists: true, $ne: "" } }).select("_id").lean(),
    ]);
    const jobs = await Promise.all(messages.flatMap((message) => {
      const queued = [];
      if (message.content?.trim()) queued.push(indexingService.enqueue({ caseId, sourceType: "message", sourceId: message._id }));
      if (message.fileUrl) queued.push(indexingService.enqueue({ caseId, sourceType: "document", sourceId: message._id }));
      return queued;
    }).concat(meetings.map((meeting) => indexingService.enqueue({ caseId, sourceType: "meeting", sourceId: meeting._id }))));
    res.status(202).json({ success: true, data: { queued: jobs.length, jobs: jobs.map((job) => String(job._id)) } });
  } catch (error) { next(error); }
};

const backfillAllCases = async (req, res, next) => {
  try {
    const Message = require("../models/Message");
    const Meeting = require("../models/Meeting");
    const cases = await Case.find({ status: { $ne: "archived" } }).select("_id title description category priority status createdAt").lean();
    let totalQueued = 0;
    const allJobs = [];

    // 1. Reset all previously failed jobs so the worker retries them
    const resetResult = await AIIndexJob.updateMany(
      { status: "failed" },
      { $set: { status: "queued", attempts: 0, error: "", lockedAt: null } }
    );
    const resetCount = resetResult.modifiedCount || 0;
    if (resetCount > 0) {
      console.log(`[Backfill] Reset ${resetCount} previously failed jobs to queued`);
    }

    // 2. Embed case-level data into caseroom_embeddings collection
    let casesEmbedded = 0;
    for (const c of cases) {
      try {
        await embeddingService.embedCase(c);
        casesEmbedded++;
      } catch (err) {
        console.error(`[Backfill] Failed to embed case ${c._id}:`, err.message);
      }
    }
    console.log(`[Backfill] Embedded ${casesEmbedded}/${cases.length} cases into caseroom_embeddings`);

    // 3. Queue message/document/meeting indexing jobs for caseroom_evidence collection
    for (const c of cases) {
      const caseId = c._id;
      const [messages, meetings] = await Promise.all([
        Message.find({ caseId, isDeleted: false }).select("_id type content fileUrl").lean(),
        Meeting.find({ caseId, transcript: { $exists: true, $ne: "" } }).select("_id").lean(),
      ]);
      const jobs = await Promise.all(messages.flatMap((message) => {
        const queued = [];
        if (message.content?.trim()) queued.push(indexingService.enqueue({ caseId, sourceType: "message", sourceId: message._id }));
        if (message.fileUrl) queued.push(indexingService.enqueue({ caseId, sourceType: "document", sourceId: message._id }));
        return queued;
      }).concat(meetings.map((meeting) => indexingService.enqueue({ caseId, sourceType: "meeting", sourceId: meeting._id }))));

      totalQueued += jobs.length;
      allJobs.push(...jobs.map((job) => String(job._id)));
    }

    res.status(202).json({
      success: true,
      data: {
        totalCases: cases.length,
        casesEmbedded,
        resetFailedJobs: resetCount,
        totalQueued,
        jobs: allJobs,
      },
    });
  } catch (error) { next(error); }
};

const getIndexJob = async (req, res, next) => {
  try {
    const job = await AIIndexJob.findById(req.params.jobId).lean();
    if (!job) return res.status(404).json({ success: false, message: "Index job not found" });
    await ragService.assertCaseAccess(job.caseId, req.user._id);
    res.json({ success: true, data: job });
  } catch (error) { next(error); }
};

const scanContradictions = async (req, res, next) => {
  try {
    const { caseId } = req.body;
    await ragService.assertCaseAccess(caseId, req.user._id);
    const job = await indexingService.enqueue({ caseId, sourceType: "message", sourceId: req.user._id, action: "scan_contradictions" });
    res.status(202).json({ success: true, data: { jobId: String(job._id) } });
  } catch (error) { next(error); }
};

const listInsights = async (req, res, next) => {
  try {
    await ragService.assertCaseAccess(req.params.caseId, req.user._id);
    const data = await AIInsight.find({ caseId: req.params.caseId, type: "contradiction" }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const updateInsight = async (req, res, next) => {
  try {
    const insight = await AIInsight.findById(req.params.insightId);
    if (!insight) return res.status(404).json({ success: false, message: "Insight not found" });
    await ragService.assertCaseAccess(insight.caseId, req.user._id);
    if (!["reviewed", "dismissed"].includes(req.body.status)) return res.status(400).json({ success: false, message: "Invalid insight status" });
    insight.status = req.body.status; insight.reviewedBy = req.user._id; insight.reviewedAt = new Date(); await insight.save();
    res.json({ success: true, data: insight });
  } catch (error) { next(error); }
};

module.exports = {
  getChatSummary,
  getMeetingSummary,
  searchCases,
  getSimilarCases,
  checkDuplicate,

  getTimeline,
  extractTasks,
  askCaseAssistant,
  askDocument,

  listConversations,
  getConversation,
  updateConversation,
  deleteConversation,
  backfillCase,
  backfillAllCases,
  getIndexJob,
  scanContradictions,
  listInsights,
  updateInsight,
};
