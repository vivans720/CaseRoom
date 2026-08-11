const { ChatMistralAI } = require("@langchain/mistralai");

module.exports = {
  name: "mistral",
  apiKeyEnv: "MISTRAL_API_KEY",
  capabilities: {
    streaming: true,
    structuredOutput: true,
    toolCalling: true,
    vision: false,
  },
  createModel({ temperature = 0.3 } = {}) {
    return new ChatMistralAI({
      apiKey: process.env.MISTRAL_API_KEY,
      modelName: process.env.MISTRAL_MODEL || "mistral-small-latest",
      temperature,
    });
  },
};
