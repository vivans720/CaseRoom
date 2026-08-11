const { ChatOllama } = require("@langchain/ollama");

module.exports = {
  name: "ollama",
  apiKeyEnv: null,
  capabilities: {
    streaming: true,
    structuredOutput: true,
    toolCalling: false,
    vision: false,
  },
  createModel({ temperature = 0.3 } = {}) {
    return new ChatOllama({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || process.env.OLLAMA_LLM_MODEL || "gemma3:4b",
      temperature,
    });
  },
};
