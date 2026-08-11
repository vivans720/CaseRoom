require("dotenv").config();
const mongoose = require("mongoose");
const Case = require("../src/models/Case");
const Message = require("../src/models/Message");
const Meeting = require("../src/models/Meeting");
const indexingService = require("../src/services/ai/indexing.service");

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Error: MONGO_URI or MONGODB_URI environment variable is required.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully.");

  const cases = await Case.find({ status: { $ne: "archived" } }).select("_id title").lean();
  console.log(`Found ${cases.length} active cases.`);

  let totalQueued = 0;

  for (const c of cases) {
    const caseId = c._id;
    console.log(`Enqueueing jobs for Case ID: ${caseId} (${c.title || "Untitled"})...`);

    const [messages, meetings] = await Promise.all([
      Message.find({ caseId, isDeleted: false }).select("_id type content fileUrl").lean(),
      Meeting.find({ caseId, transcript: { $exists: true, $ne: "" } }).select("_id").lean(),
    ]);

    const jobs = await Promise.all(
      messages.flatMap((message) => {
        const queued = [];
        if (message.content?.trim()) {
          queued.push(indexingService.enqueue({ caseId, sourceType: "message", sourceId: message._id }));
        }
        if (message.fileUrl) {
          queued.push(indexingService.enqueue({ caseId, sourceType: "document", sourceId: message._id }));
        }
        return queued;
      }).concat(
        meetings.map((meeting) => indexingService.enqueue({ caseId, sourceType: "meeting", sourceId: meeting._id }))
      )
    );

    totalQueued += jobs.length;
    console.log(`Case ${caseId}: queued ${jobs.length} items.`);
  }

  console.log(`\nAll done! Total queued indexing jobs across all cases: ${totalQueued}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Backfill script error:", err);
  process.exit(1);
});
