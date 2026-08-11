const { Embeddings } = require("@langchain/core/embeddings");

class JinaEmbeddings extends Embeddings {
  constructor(fields = {}) {
    super(fields);
    this.apiKey = fields.apiKey || process.env.JINA_API_KEY;
    this.model = fields.model || process.env.JINA_EMBED_MODEL || "jina-embeddings-v3";
    this.baseUrl = fields.baseUrl || "https://api.jina.ai/v1/embeddings";
  }

  async _embed(inputs, task) {
    if (!this.apiKey) {
      throw new Error("JINA_API_KEY environment variable or apiKey parameter is required");
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        task,
        late_chunking: false,
        dimensions: 1024,
        embedding_type: "float",
        input: inputs,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jina AI Embeddings API error (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    if (!json.data || !Array.isArray(json.data)) {
      throw new Error("Invalid response format from Jina AI Embeddings API");
    }

    return json.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
  }

  async embedDocuments(documents) {
    if (!documents || documents.length === 0) return [];
    const batchSize = 32;
    const results = [];
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchEmbeddings = await this._embed(batch, "retrieval.passage");
      results.push(...batchEmbeddings);
    }
    return results;
  }

  async embedQuery(document) {
    const embeddings = await this._embed([document], "retrieval.query");
    return embeddings[0] || [];
  }
}

module.exports = JinaEmbeddings;
