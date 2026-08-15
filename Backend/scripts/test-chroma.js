require("dotenv").config();
const { getVectorStore } = require("../src/config/langchain");

async function run() {
  try {
    const store = await getVectorStore();
    const query = "Title: Frontend Bug. Description: Discussion regarding a bug in Frontend";
    const res = await store.similaritySearchWithScore(query, 5);
    
    console.log("Results for mapping test:");
    res.forEach((r, i) => {
      const score = r[1];
      const confidence = Math.max(0, Math.min(1, (1.6 - score) / 0.5)); // Using 0.5 divisor for slightly steeper drop-off
      const simPct = Math.round(confidence * 100);
      console.log(`[${i}] Score: ${score.toFixed(4)} | Pct: ${simPct}% | Text: ${r[0].pageContent.substring(0, 50)}`);
    });
    
  } catch (err) {
    console.log("Error:", err.message);
  }
  process.exit();
}
run();
