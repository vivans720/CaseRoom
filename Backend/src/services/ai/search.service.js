const Case = require("../../models/Case");
const { getVectorStore } = require("../../config/langchain");

/**
 * Production-Grade Hybrid AI Semantic Search
 * Combines ChromaDB vector search + MongoDB keyword/ID matching, thresholding (<60 relevance dropped) & ACL validation
 */
const semanticSearch = async (queryText, userId, limit = 15) => {
  if (!queryText || queryText.trim().length === 0) {
    return [];
  }

  const queryClean = queryText.trim();
  const scoreMap = new Map(); // caseId -> relevanceScore (30-99)
  const candidateIdsSet = new Set();

  // 1. Vector Similarity Pass
  try {
    const vectorStore = await getVectorStore();
    const results = await vectorStore.similaritySearchWithScore(queryClean, limit * 2);

    for (const [doc, score] of results) {
      const cId = doc.metadata?.caseId;
      if (cId) {
        let simScore = 75;
        if (typeof score === "number") {
          simScore = score <= 1 ? Math.round((1 - score) * 100) : Math.round((1 / (1 + score)) * 100);
        }
        const clampedScore = Math.max(30, Math.min(99, simScore));
        if (clampedScore >= 60) {
          scoreMap.set(cId, clampedScore);
          candidateIdsSet.add(cId);
        }
      }
    }
  } catch (err) {
    console.warn("[ChromaDB] Semantic search vector pass failed:", err.message);
  }

  // 2. Lexical / Exact Identifier Pass (Hybrid Fusion for IP addresses, Case IDs, Employee IDs)
  const keywords = queryClean.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  const regexPatterns = keywords.length > 0 ? keywords.map((k) => new RegExp(k, "i")) : [new RegExp(queryClean, "i")];

  const lexicalCases = await Case.find({
    $or: [{ "participants.user": userId }, { creatorId: userId }],
    $and: [
      { status: { $ne: "archived" } },
      {
        $or: [
          { title: { $in: regexPatterns } },
          { description: { $in: regexPatterns } },
          { category: { $in: regexPatterns } },
        ],
      },
    ],
  })
    .select("_id")
    .limit(limit)
    .lean();

  lexicalCases.forEach((c) => {
    const id = c._id.toString();
    candidateIdsSet.add(id);
    // Give exact keyword matches high relevance score boost
    const existing = scoreMap.get(id) || 70;
    scoreMap.set(id, Math.min(99, existing + 15));
  });

  if (candidateIdsSet.size === 0) return [];

  // 3. Strict MongoDB Permission Boundary ACL Query
  const accessibleCases = await Case.find({
    _id: { $in: Array.from(candidateIdsSet) },
    $or: [{ "participants.user": userId }, { creatorId: userId }],
  })
    .populate("creatorId", "name email profilePictureUrl")
    .populate("participants.user", "name email profilePictureUrl")
    .lean();

  return accessibleCases
    .map((c) => ({
      ...c,
      relevanceScore: scoreMap.get(c._id.toString()) || 65,
    }))
    .filter((c) => c.relevanceScore >= 60) // Filter out weak matches (<60 relevance)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
};

module.exports = {
  semanticSearch,
};
