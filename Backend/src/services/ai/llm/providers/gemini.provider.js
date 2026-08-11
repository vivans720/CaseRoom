const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

module.exports = {
  name: "gemini",
  apiKeyEnv: "GEMINI_API_KEY",
  capabilities: {
    streaming: true,
    structuredOutput: true,
    toolCalling: true,
    vision: true,
  },
  createModel({ temperature = 0.3 } = {}) {
    return new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      modelName: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      temperature,
    });
  },
};
