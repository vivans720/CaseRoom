const LLM_ERROR_TYPES = {
  RATE_LIMIT: "RATE_LIMIT",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  TIMEOUT: "TIMEOUT",
  TEMPORARY_UNAVAILABLE: "TEMPORARY_UNAVAILABLE",
  AUTH_ERROR: "AUTH_ERROR",
  INVALID_REQUEST: "INVALID_REQUEST",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  UNKNOWN: "UNKNOWN",
};

class LLMError extends Error {
  constructor(message, { type, provider, retryable, originalError } = {}) {
    super(message);
    this.name = "LLMError";
    this.type = type || LLM_ERROR_TYPES.UNKNOWN;
    this.provider = provider;
    this.retryable = retryable !== undefined ? retryable : isRetryable(this.type);
    this.originalError = originalError;
  }
}

class AllProvidersFailedError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "AllProvidersFailedError";
    this.errors = errors;
  }
}

function isRetryable(errorType) {
  return [
    LLM_ERROR_TYPES.RATE_LIMIT,
    LLM_ERROR_TYPES.QUOTA_EXCEEDED,
    LLM_ERROR_TYPES.TIMEOUT,
    LLM_ERROR_TYPES.TEMPORARY_UNAVAILABLE,
    LLM_ERROR_TYPES.UNKNOWN,
  ].includes(errorType);
}

function classifyError(error) {
  if (!error) return LLM_ERROR_TYPES.UNKNOWN;

  const status = error.status || error.response?.status;
  
  if (status === 429) return LLM_ERROR_TYPES.RATE_LIMIT;
  if (status === 408) return LLM_ERROR_TYPES.TIMEOUT;
  if ([500, 502, 503, 504].includes(status)) return LLM_ERROR_TYPES.TEMPORARY_UNAVAILABLE;
  if (status === 400) return LLM_ERROR_TYPES.INVALID_REQUEST;
  if (status === 401 || status === 403) return LLM_ERROR_TYPES.AUTH_ERROR;

  const code = error.code?.toUpperCase();
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return LLM_ERROR_TYPES.TEMPORARY_UNAVAILABLE;
  }
  if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
    return LLM_ERROR_TYPES.TIMEOUT;
  }

  if (error.name === "AbortError") {
    return LLM_ERROR_TYPES.TIMEOUT;
  }

  const message = (error.message || "").toLowerCase();
  
  if (message.includes("timeout") || message.includes("time out") || message.includes("timed out")) {
    return LLM_ERROR_TYPES.TIMEOUT;
  }
  
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return LLM_ERROR_TYPES.RATE_LIMIT;
  }
  
  if (message.includes("quota") || message.includes("exceeded") || message.includes("insufficient_quota")) {
    return LLM_ERROR_TYPES.QUOTA_EXCEEDED;
  }
  
  if (message.includes("network") || message.includes("socket") || message.includes("connection")) {
    return LLM_ERROR_TYPES.TEMPORARY_UNAVAILABLE;
  }

  return LLM_ERROR_TYPES.UNKNOWN;
}

module.exports = {
  LLM_ERROR_TYPES,
  LLMError,
  AllProvidersFailedError,
  classifyError,
  isRetryable,
};
