const { ChatGroq } = require("@langchain/groq");

module.exports = {
  name: "groq",
  apiKeyEnv: "GROQ_API_KEY",
  capabilities: {
    streaming: true,
    structuredOutput: true,
    toolCalling: true,
    vision: false,
  },
  createModel({ temperature = 0.3 } = {}) {
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    return new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model,
      modelName: model,
      temperature,
    });
  },
};
