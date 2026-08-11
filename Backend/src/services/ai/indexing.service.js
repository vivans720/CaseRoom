const AIIndexJob = require("../../models/AIIndexJob");
const AIClaim = require("../../models/AIClaim");
const AIInsight = require("../../models/AIInsight");
const Message = require("../../models/Message");
const Meeting = require("../../models/Meeting");
const { getEvidenceVectorStore } = require("../../config/langchain");
const { extractDocument, splitText } = require("./documentProcessor.service");

/**
 * Idempotent Job Queue Enqueueing
 */
const enqueue = async ({ caseId, sourceType, sourceId, action = "upsert" }) => {
  // Check if active job already queued for same sourceId and action
  const existing = await AIIndexJob.findOne({
    caseId,
    sourceType,
    sourceId,
    action,
    status: { $in: ["queued", "processing"] },
  });

  if (existing) {
    return existing;
  }

  return AIIndexJob.create({ caseId, sourceType, sourceId, action });
};

const toDocuments = ({ sourceType, sourceId, caseId, version, baseMetadata, sections }) => {
  const docs = [];
  sections.forEach((section, sectionIndex) => {
    splitText(section.text).forEach((text, chunkIndex) => {
      const id = `${sourceType}:${sourceId}:${section.pageNumber || section.segment || sectionIndex}:${chunkIndex}`;
      docs.push({
        id,
        pageContent: text,
        metadata: {
          caseId: String(caseId),
          sourceType,
          sourceId: String(sourceId),
          sourceVersion: version,
          pageNumber: section.pageNumber || 0,
          segment: section.segment || "",
          chunkIndex,
          ...baseMetadata,
        },
      });
    });
  });
  return docs;
};

const deleteSource = async (sourceType, sourceId) => {
  const store = await getEvidenceVectorStore();
  if (store.delete) {
    await store.delete({ filter: { sourceId: String(sourceId), sourceType } });
  }
  await AIClaim.deleteMany({ sourceId });
  await AIInsight.updateMany({ "sources.sourceId": String(sourceId) }, { status: "invalidated" });
};

/**
 * Version-Safe Upsert Processing
 */
const upsertSource = async (job) => {
  const { sourceType, sourceId, caseId } = job;
  await deleteSource(sourceType, sourceId);

  let documents = [];

  if (sourceType === "message") {
    const message = await Message.findById(sourceId).populate("senderId", "name").lean();
    if (!message || message.isDeleted || !message.content?.trim()) return { status: "complete" };

    documents = toDocuments({
      sourceType,
      sourceId,
      caseId,
      version: message.updatedAt.toISOString(),
      baseMetadata: {
        senderName: message.senderId?.name || "Unknown",
        createdAt: message.createdAt.toISOString(),
        fileName: "",
      },
      sections: [{ text: message.content, segment: "message" }],
    });
  } else if (sourceType === "document") {
    const message = await Message.findById(sourceId).lean();
    if (!message || message.isDeleted || !message.fileUrl) return { status: "complete" };

    const extracted = await extractDocument(message);
    if (!extracted.supported) {
      return { status: "unsupported", error: extracted.error || "Document type is not indexable" };
    }

    documents = toDocuments({
      sourceType,
      sourceId,
      caseId,
      version: message.updatedAt.toISOString(),
      baseMetadata: {
        fileName: message.fileName || "Document",
        createdAt: message.createdAt.toISOString(),
        senderName: "",
      },
      sections: extracted.pages,
    });
  } else if (sourceType === "meeting") {
    const meeting = await Meeting.findById(sourceId).lean();
    if (!meeting?.transcript?.trim()) return { status: "complete" };

    documents = toDocuments({
      sourceType,
      sourceId,
      caseId,
      version: meeting.updatedAt.toISOString(),
      baseMetadata: {
        fileName: "",
        createdAt: meeting.updatedAt.toISOString(),
        senderName: "",
      },
      sections: [{ text: meeting.transcript, segment: "notes" }],
    });
  }

  if (documents.length) {
    const store = await getEvidenceVectorStore();
    await store.addDocuments(
      documents.map(({ id, ...document }) => document),
      { ids: documents.map((doc) => doc.id) }
    );
  }

  return { status: "complete" };
};

/**
 * Stale Job Recovery Daemon
 * Resets jobs stuck in "processing" for > 10 minutes back to "queued"
 */
const recoverStaleJobs = async () => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  await AIIndexJob.updateMany(
    { status: "processing", lockedAt: { $lt: tenMinutesAgo } },
    { $set: { status: "queued", error: "Stale job recovered from timeout lock" } }
  );
};

/**
 * Worker Single-Job Execution Core
 */
const processOne = async () => {
  await recoverStaleJobs();

  const job = await AIIndexJob.findOneAndUpdate(
    { status: { $in: ["queued", "failed"] }, attempts: { $lt: 3 } },
    { $set: { status: "processing", lockedAt: new Date(), error: "" }, $inc: { attempts: 1 } },
    { returnDocument: "after", sort: { createdAt: 1 } }
  );

  if (!job) return null;

  try {
    if (job.action === "delete") {
      await deleteSource(job.sourceType, job.sourceId);
      job.status = "complete";
    } else if (job.action === "scan_contradictions") {
      await require("./contradiction.service").scanCase(job.caseId);
      job.status = "complete";
    } else {
      const result = await upsertSource(job);
      job.status = result.status;
      job.error = result.error || "";
    }
    job.completedAt = new Date();
    console.log(`[IndexWorker] Job ${job._id} (${job.sourceType}:${job.sourceId}) status=${job.status}`);
  } catch (error) {
    job.status = "failed";
    job.error = error.message;
    console.error(`[IndexWorker] Job ${job._id} (${job.sourceType}:${job.sourceId}) failed:`, error.message);
  }

  await job.save();
  return job;
};

let timer;
const startWorker = () => {
  if (timer || process.env.AI_INDEX_WORKER === "false") return;
  timer = setInterval(() => {
    void processOne();
  }, Number(process.env.AI_INDEX_INTERVAL_MS || 1500));
  timer.unref?.();
};

module.exports = { enqueue, processOne, startWorker, deleteSource, recoverStaleJobs };
