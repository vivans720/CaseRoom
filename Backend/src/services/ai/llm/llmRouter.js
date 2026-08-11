const { Runnable } = require("@langchain/core/runnables");
const providerFactory = require("./providerFactory");
const providerHealth = require("./providerHealth");
const { classifyError, isRetryable, AllProvidersFailedError } = require("./llmErrors");

class RouterLLM extends Runnable {
  static lc_name() {
    return "RouterLLM";
  }

  lc_namespace = ["caseroom", "llm"];

  constructor({ temperature = 0.3, task = "default" } = {}) {
    super();
    this.temperature = temperature;
    this.task = task;
  }

  async invoke(input, options = {}) {
    const chain = providerFactory.getProviderChain();
    const timeoutMs = parseInt(process.env.LLM_PROVIDER_TIMEOUT_MS || "30000", 10);
    const maxRetries = parseInt(process.env.LLM_PROVIDER_MAX_RETRIES || "1", 10);
    const collectedErrors = [];

    for (let i = 0; i < chain.length; i++) {
      const provider = chain[i];

      if (!providerHealth.isAvailable(provider.name)) {
        continue;
      }

      const model = provider.createModel({ temperature: this.temperature });

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const startTime = Date.now();

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const invokeOptions = { ...options };
          if (!invokeOptions.signal) {
            invokeOptions.signal = controller.signal;
          }

          const response = await model.invoke(input, invokeOptions);
          clearTimeout(timeoutId);

          const latencyMs = Date.now() - startTime;
          providerHealth.markSuccess(provider.name);

          console.log(`[LLM] task=${this.task} provider=${provider.name} status=success latency=${latencyMs}ms`);

          if (response && typeof response === "object") {
            response._llmMetadata = {
              provider: provider.name,
              latencyMs,
            };
          }

          return response;
        } catch (error) {
          clearTimeout && undefined; // timeout already cleared on success path
          const latencyMs = Date.now() - startTime;
          const errorType = classifyError(error);
          const retryable = isRetryable(errorType);

          if (!retryable) {
            console.error(`[LLM] task=${this.task} provider=${provider.name} status=${errorType} non_retryable=true`);
            throw error;
          }

          console.warn(`[LLM] task=${this.task} provider=${provider.name} status=${errorType} latency=${latencyMs}ms attempt=${attempt + 1}/${maxRetries + 1}`);

          if (attempt >= maxRetries) {
            providerHealth.markFailed(provider.name, errorType);
            collectedErrors.push({ provider: provider.name, errorType, error });

            const nextProvider = chain[i + 1];
            if (nextProvider) {
              console.warn(`[LLM] task=${this.task} fallback provider=${nextProvider.name}`);
            }
            break;
          }
        }
      }
    }

    console.error(`[LLM] task=${this.task} status=all_providers_failed`);
    throw new AllProvidersFailedError(
      `All LLM providers failed for task '${this.task}'.`,
      collectedErrors
    );
  }
}

async function getRouterLLM({ temperature = 0.3, task = "default" } = {}) {
  return new RouterLLM({ temperature, task });
}

module.exports = {
  RouterLLM,
  getRouterLLM,
};
