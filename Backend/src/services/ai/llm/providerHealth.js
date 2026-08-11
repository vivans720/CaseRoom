const _state = new Map();

function getCooldownMs() {
  const envMs = parseInt(process.env.LLM_PROVIDER_COOLDOWN_MS, 10);
  return isNaN(envMs) ? 60000 : envMs;
}

function markFailed(providerName, errorType) {
  _state.set(providerName, {
    failedAt: Date.now(),
    errorType,
    cooldownMs: getCooldownMs(),
  });
}

function isAvailable(providerName) {
  const state = _state.get(providerName);
  if (!state) return true;

  const now = Date.now();
  if (now - state.failedAt >= state.cooldownMs) {
    // Cooldown expired
    _state.delete(providerName);
    return true;
  }
  
  return false;
}

function markSuccess(providerName) {
  _state.delete(providerName);
}

function getStatus() {
  return Object.fromEntries(_state);
}

function reset() {
  _state.clear();
}

module.exports = {
  markFailed,
  isAvailable,
  markSuccess,
  getStatus,
  reset,
};
