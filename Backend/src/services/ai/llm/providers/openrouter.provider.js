const { ChatOpenAI } = require("@langchain/openai");

module.exports = {
  name: "openrouter",
  apiKeyEnv: "OPENROUTER_API_KEY",
  capabilities: {
    streaming: true,
    structuredOutput: true,
    toolCalling: true,
    vision: false,
  },
  createModel({ temperature = 0.3 } = {}) {
    return new ChatOpenAI({
      openAIApiKey: process.env.OPENROUTER_API_KEY,
      modelName: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
      temperature,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://caseroom.app",
          "X-Title": "CaseRoom",
        },
      },
    });
  },
};
