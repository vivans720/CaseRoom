const { getRouterLLM } = require("../services/ai/llm/llmRouter");

let _embeddings = null;
let _vectorStore = null;
let _evidenceVectorStore = null;
let _claimVectorStore = null;

/**
 * Get LLM instance routed through multi-provider fallback chain.
 * Returns a LangChain-compatible Runnable with automatic failover.
 */
async function getLLM() {
  return getRouterLLM({ temperature: 0.3 });
}

/**
 * Lazy get OllamaEmbeddings instance
 */
async function getEmbeddings() {
  if (_embeddings) return _embeddings;
  const { OllamaEmbeddings } = await import("@langchain/ollama");
  _embeddings = new OllamaEmbeddings({
    model: process.env.OLLAMA_EMBED_MODEL || "qllama/bge-small-en-v1.5",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  });
  return _embeddings;
}

/**
 * Lazy get Chroma VectorStore instance
 */
async function getNamedVectorStore(collectionName) {
  const { Chroma } = await import("@langchain/community/vectorstores/chroma");
  const { ChromaClient } = await import("chromadb");
  const embeddings = await getEmbeddings();
  const rawUrl = process.env.CHROMA_URL || process.env.CHROMADB_URL || "http://localhost:8000";
  let client;
  try {
    const parsed = new URL(rawUrl);
    client = new ChromaClient({
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === "https:" ? 443 : 80),
      ssl: parsed.protocol === "https:",
    });
  } catch {
    client = new ChromaClient({ host: "localhost", port: 8000, ssl: false });
  }
  return new Chroma(embeddings, {
    index: client,
    collectionName,
  });
}

async function getVectorStore() {
  if (_vectorStore) return _vectorStore;
  _vectorStore = await getNamedVectorStore(
    process.env.CHROMA_COLLECTION_NAME || "caseroom_embeddings",
  );
  return _vectorStore;
}

// Evidence deliberately lives apart from legacy case-title embeddings. Existing
// semantic search and similar-case ranking therefore cannot be polluted by chunks.
async function getEvidenceVectorStore() {
  if (_evidenceVectorStore) return _evidenceVectorStore;
  _evidenceVectorStore = await getNamedVectorStore(
    process.env.CHROMA_EVIDENCE_COLLECTION_NAME || "caseroom_evidence",
  );
  return _evidenceVectorStore;
}

async function getClaimVectorStore() {
  if (_claimVectorStore) return _claimVectorStore;
  _claimVectorStore = await getNamedVectorStore(
    process.env.CHROMA_CLAIM_COLLECTION_NAME || "caseroom_claims",
  );
  return _claimVectorStore;
}

module.exports = {
  getLLM,
  getEmbeddings,
  getVectorStore,
  getEvidenceVectorStore,
  getClaimVectorStore,
};
