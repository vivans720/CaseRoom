require("dotenv").config();
const connectDB = require("../src/config/db");
const Case = require("../src/models/Case");
const { embedCase } = require("../src/services/ai/embedding.service");

async function run() {
  console.log("Starting embedding generation script...");
  await connectDB();

  const cases = await Case.find({});
  console.log(`Found ${cases.length} cases to process.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < cases.length; i++) {
    const caseDoc = cases[i];
    console.log(`[${i + 1}/${cases.length}] Embedding case: ${caseDoc.title} (${caseDoc._id})`);
    
    const ok = await embedCase(caseDoc);
    if (ok) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log("\n==========================================");
  console.log(`Embedding generation complete!`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log("==========================================\n");

  process.exit(0);
}

run().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
