const { ChatOpenAI } = require("@langchain/openai");

module.exports = {
  name: "cerebras",
  apiKeyEnv: "CEREBRAS_API_KEY",
  capabilities: {
    streaming: true,
    structuredOutput: true,
    toolCalling: false,
    vision: false,
  },
  createModel({ temperature = 0.3 } = {}) {
    const model = process.env.CEREBRAS_MODEL || "llama-3.3-70b";
    return new ChatOpenAI({
      openAIApiKey: process.env.CEREBRAS_API_KEY,
      model,
      modelName: model,
      temperature,
      configuration: {
        baseURL: "https://api.cerebras.ai/v1",
      },
    });
  },
};
