const { LLMError, LLM_ERROR_TYPES } = require("./llmErrors");

const PROVIDER_REGISTRY = {
  gemini: "./providers/gemini.provider",
  groq: "./providers/groq.provider",
  cerebras: "./providers/cerebras.provider",
  openrouter: "./providers/openrouter.provider",
  mistral: "./providers/mistral.provider",
  ollama: "./providers/ollama.provider",
};

const DEFAULT_PRODUCTION_ORDER = "gemini,groq,cerebras,openrouter,mistral";
const DEFAULT_DEVELOPMENT_ORDER = "gemini,groq,cerebras,openrouter,mistral,ollama";

let cachedProviderChain = null;

function getProviderChain() {
  if (cachedProviderChain) {
    return cachedProviderChain;
  }

  const isProd = process.env.NODE_ENV === "production";
  const orderString =
    process.env.LLM_PROVIDER_ORDER ||
    (isProd ? DEFAULT_PRODUCTION_ORDER : DEFAULT_DEVELOPMENT_ORDER);

  let providerNames = orderString
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  if (isProd && providerNames.includes("ollama")) {
    console.warn("[LLM] WARNING: 'ollama' found in LLM_PROVIDER_ORDER in production. Removing automatically.");
    providerNames = providerNames.filter((p) => p !== "ollama");
  }

  const chain = [];

  for (const name of providerNames) {
    if (!PROVIDER_REGISTRY[name]) {
      console.warn(`[LLM] WARNING: Unknown provider '${name}' in LLM_PROVIDER_ORDER. Skipping.`);
      continue;
    }

    try {
      const providerModule = require(PROVIDER_REGISTRY[name]);

      if (providerModule.apiKeyEnv != null) {
        const apiKey = process.env[providerModule.apiKeyEnv];
        if (!apiKey || apiKey.trim() === "") {
          console.warn(`[LLM] Provider '${name}' skipped — missing ${providerModule.apiKeyEnv}`);
          continue;
        }
      }

      chain.push(providerModule);
    } catch (error) {
      console.warn(`[LLM] Failed to load provider '${name}':`, error.message);
    }
  }

  if (chain.length === 0) {
    throw new LLMError(
      "No LLM providers available. Set at least one provider API key or configure OLLAMA in development.",
      { type: LLM_ERROR_TYPES.CONFIGURATION_ERROR, retryable: false }
    );
  }

  console.log(`[LLM] Provider chain initialized: ${chain.map((p) => p.name).join(" → ")}`);
  cachedProviderChain = chain;
  return chain;
}

function getAvailableProviders() {
  return getProviderChain().map((p) => p.name);
}

function resetCache() {
  cachedProviderChain = null;
}

module.exports = {
  getProviderChain,
  getAvailableProviders,
  resetCache,
};
