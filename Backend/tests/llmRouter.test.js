const {
  LLM_ERROR_TYPES,
  LLMError,
  AllProvidersFailedError,
  classifyError,
  isRetryable,
} = require('../src/services/ai/llm/llmErrors');

const providerHealth = require('../src/services/ai/llm/providerHealth');
const providerFactory = require('../src/services/ai/llm/providerFactory');
const { RouterLLM } = require('../src/services/ai/llm/llmRouter');

// Mock individual provider modules for providerFactory tests
jest.mock('../src/services/ai/llm/providers/ollama', () => ({ name: 'ollama', apiKeyEnv: null }), { virtual: true });
jest.mock('../src/services/ai/llm/providers/openai', () => ({ name: 'openai', apiKeyEnv: 'OPENAI_API_KEY' }), { virtual: true });
jest.mock('../src/services/ai/llm/providers/anthropic', () => ({ name: 'anthropic', apiKeyEnv: 'ANTHROPIC_API_KEY' }), { virtual: true });

describe('LLM Router Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('llmErrors', () => {
    it('classifyError correctly classifies HTTP 429, 408, 500, 502, 503, 504, 400, 401, 403', () => {
      expect(classifyError({ status: 429 })).toBe(LLM_ERROR_TYPES.RATE_LIMIT);
      expect(classifyError({ status: 408 })).toBe(LLM_ERROR_TYPES.TIMEOUT);
      expect(classifyError({ status: 500 })).toBe(LLM_ERROR_TYPES.TEMPORARY_UNAVAILABLE);
      expect(classifyError({ status: 502 })).toBe(LLM_ERROR_TYPES.TEMPORARY_UNAVAILABLE);
      expect(classifyError({ status: 503 })).toBe(LLM_ERROR_TYPES.TEMPORARY_UNAVAILABLE);
      expect(classifyError({ status: 504 })).toBe(LLM_ERROR_TYPES.TEMPORARY_UNAVAILABLE);
      expect(classifyError({ status: 400 })).toBe(LLM_ERROR_TYPES.INVALID_REQUEST);
      expect(classifyError({ status: 401 })).toBe(LLM_ERROR_TYPES.AUTH_ERROR);
      expect(classifyError({ status: 403 })).toBe(LLM_ERROR_TYPES.AUTH_ERROR);
    });

    it('classifyError handles error codes: ECONNREFUSED, ETIMEDOUT, AbortError', () => {
      expect(classifyError({ code: 'ECONNREFUSED' })).toBe(LLM_ERROR_TYPES.TEMPORARY_UNAVAILABLE);
      expect(classifyError({ code: 'ETIMEDOUT' })).toBe(LLM_ERROR_TYPES.TIMEOUT);
      expect(classifyError({ name: 'AbortError' })).toBe(LLM_ERROR_TYPES.TIMEOUT);
    });

    it('classifyError handles message patterns: rate limit, timeout, quota', () => {
      expect(classifyError(new Error('rate limit exceeded'))).toBe(LLM_ERROR_TYPES.RATE_LIMIT);
      expect(classifyError(new Error('timeout occurred'))).toBe(LLM_ERROR_TYPES.TIMEOUT);
      expect(classifyError(new Error('quota exceeded'))).toBe(LLM_ERROR_TYPES.QUOTA_EXCEEDED);
    });

    it('isRetryable returns true for RATE_LIMIT, QUOTA_EXCEEDED, TIMEOUT, TEMPORARY_UNAVAILABLE, UNKNOWN', () => {
      expect(isRetryable(LLM_ERROR_TYPES.RATE_LIMIT)).toBe(true);
      expect(isRetryable(LLM_ERROR_TYPES.QUOTA_EXCEEDED)).toBe(true);
      expect(isRetryable(LLM_ERROR_TYPES.TIMEOUT)).toBe(true);
      expect(isRetryable(LLM_ERROR_TYPES.TEMPORARY_UNAVAILABLE)).toBe(true);
      expect(isRetryable(LLM_ERROR_TYPES.UNKNOWN)).toBe(true);
    });

    it('isRetryable returns false for AUTH_ERROR, INVALID_REQUEST, CONFIGURATION_ERROR', () => {
      expect(isRetryable(LLM_ERROR_TYPES.AUTH_ERROR)).toBe(false);
      expect(isRetryable(LLM_ERROR_TYPES.INVALID_REQUEST)).toBe(false);
      expect(isRetryable(LLM_ERROR_TYPES.CONFIGURATION_ERROR)).toBe(false);
    });
  });

  describe('providerHealth', () => {
    beforeEach(() => {
      providerHealth.reset();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('markFailed + isAvailable correctly marks provider unavailable', () => {
      expect(providerHealth.isAvailable('test_provider')).toBe(true);
      providerHealth.markFailed('test_provider');
      expect(providerHealth.isAvailable('test_provider')).toBe(false);
    });

    it('cooldown expiry makes provider available again', () => {
      providerHealth.markFailed('test_provider');
      expect(providerHealth.isAvailable('test_provider')).toBe(false);
      
      // Fast-forward time (e.g., 5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000);
      expect(providerHealth.isAvailable('test_provider')).toBe(true);
    });

    it('markSuccess clears cooldown', () => {
      providerHealth.markFailed('test_provider');
      expect(providerHealth.isAvailable('test_provider')).toBe(false);
      providerHealth.markSuccess('test_provider');
      expect(providerHealth.isAvailable('test_provider')).toBe(true);
    });

    it('reset clears all state', () => {
      providerHealth.markFailed('test_provider');
      providerHealth.reset();
      expect(providerHealth.isAvailable('test_provider')).toBe(true);
    });
  });

  describe('providerFactory', () => {
    let originalEnv;
    let consoleWarnSpy;

    beforeEach(() => {
      originalEnv = process.env;
      process.env = { ...originalEnv };
      providerFactory.resetCache();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Ensure API keys are set for tests unless otherwise specified
      process.env.GEMINI_API_KEY = 'test-key';
      process.env.GROQ_API_KEY = 'test-key';
      process.env.CEREBRAS_API_KEY = 'test-key';
      process.env.OPENROUTER_API_KEY = 'test-key';
      process.env.MISTRAL_API_KEY = 'test-key';
    });

    afterEach(() => {
      process.env = originalEnv;
      consoleWarnSpy.mockRestore();
    });

    it('filters out ollama in production (NODE_ENV=production)', () => {
      process.env.NODE_ENV = 'production';
      process.env.LLM_PROVIDER_ORDER = 'ollama,gemini';
      const chain = providerFactory.getProviderChain();
      expect(chain.some(p => p.name === 'ollama')).toBe(false);
      expect(chain.some(p => p.name === 'gemini')).toBe(true);
    });

    it('logs warning when ollama in production config', () => {
      process.env.NODE_ENV = 'production';
      process.env.LLM_PROVIDER_ORDER = 'ollama,gemini';
      providerFactory.getProviderChain();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('ollama'));
    });

    it('skips providers with missing API keys', () => {
      process.env.NODE_ENV = 'development';
      process.env.LLM_PROVIDER_ORDER = 'gemini,groq';
      delete process.env.GEMINI_API_KEY; // Missing key
      process.env.GROQ_API_KEY = 'valid-key';

      const chain = providerFactory.getProviderChain();
      expect(chain.some(p => p.name === 'gemini')).toBe(false);
      expect(chain.some(p => p.name === 'groq')).toBe(true);
    });

    it('throws CONFIGURATION_ERROR when no providers available', () => {
      process.env.NODE_ENV = 'development';
      process.env.LLM_PROVIDER_ORDER = 'gemini';
      delete process.env.GEMINI_API_KEY;
      delete process.env.GROQ_API_KEY;
      delete process.env.CEREBRAS_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.MISTRAL_API_KEY;
      expect(() => {
        providerFactory.getProviderChain();
      }).toThrow();
    });

    it('respects LLM_PROVIDER_ORDER env var', () => {
      process.env.LLM_PROVIDER_ORDER = 'groq,gemini';
      const chain = providerFactory.getProviderChain();
      expect(chain[0].name).toBe('groq');
      expect(chain[1].name).toBe('gemini');
    });

    it('default order includes ollama in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LLM_PROVIDER_ORDER; // Use default
      const chain = providerFactory.getProviderChain();
      expect(chain.some(p => p.name === 'ollama')).toBe(true);
    });
  });

  describe('RouterLLM', () => {
    let getProviderChainSpy;
    let router;

    beforeEach(() => {
      process.env.LLM_PROVIDER_TIMEOUT_MS = '60000';
      process.env.LLM_PROVIDER_MAX_RETRIES = '1';
      
      providerHealth.reset();
      getProviderChainSpy = jest.spyOn(providerFactory, 'getProviderChain');
      router = new RouterLLM();
    });

    afterEach(() => {
      getProviderChainSpy.mockRestore();
    });

    it('Successful provider returns result', async () => {
      const mockProvider1 = {
        name: 'mock1',
        createModel: () => ({
          invoke: jest.fn().mockResolvedValue({ content: 'response' })
        })
      };
      getProviderChainSpy.mockReturnValue([mockProvider1]);

      const result = await router.invoke('test prompt');
      expect(result.content).toBe('response');
    });

    it('Rate limit fallback to next provider', async () => {
      const mockProvider1 = {
        name: 'mock1',
        createModel: () => ({
          invoke: jest.fn().mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }))
        })
      };
      const mockProvider2 = {
        name: 'mock2',
        createModel: () => ({
          invoke: jest.fn().mockResolvedValue({ content: 'fallback' })
        })
      };
      getProviderChainSpy.mockReturnValue([mockProvider1, mockProvider2]);

      const result = await router.invoke('test prompt');
      expect(result.content).toBe('fallback');
    });

    it('Multiple failures fallback to successful provider', async () => {
      const provider1 = {
        name: 'mock1',
        createModel: () => ({
          invoke: jest.fn().mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }))
        })
      };
      const provider2 = {
        name: 'mock2',
        createModel: () => ({
          invoke: jest.fn().mockRejectedValue(Object.assign(new Error('timeout'), { status: 408 }))
        })
      };
      const provider3 = {
        name: 'mock3',
        createModel: () => ({
          invoke: jest.fn().mockRejectedValue(Object.assign(new Error('temp unavailable'), { status: 503 }))
        })
      };
      const provider4 = {
        name: 'mock4',
        createModel: () => ({
          invoke: jest.fn().mockResolvedValue({ content: 'success' })
        })
      };
      getProviderChainSpy.mockReturnValue([provider1, provider2, provider3, provider4]);

      const result = await router.invoke('test prompt');
      expect(result.content).toBe('success');
    });

    it('Throws AllProvidersFailedError when all providers fail', async () => {
      const provider1 = {
        name: 'mock1',
        createModel: () => ({
          invoke: jest.fn().mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }))
        })
      };
      getProviderChainSpy.mockReturnValue([provider1]);

      await expect(router.invoke('test prompt')).rejects.toThrow(AllProvidersFailedError);
    });

    it('Non-retryable error does not fallback and throws immediately', async () => {
      const provider1 = {
        name: 'mock1',
        createModel: () => ({
          invoke: jest.fn().mockRejectedValue(Object.assign(new Error('auth error'), { status: 401 }))
        })
      };
      const provider2 = {
        name: 'mock2',
        createModel: () => ({
          invoke: jest.fn().mockResolvedValue({ content: 'fallback' })
        })
      };
      getProviderChainSpy.mockReturnValue([provider1, provider2]);

      await expect(router.invoke('test prompt')).rejects.toThrow('auth error');
    });

    it('provider on cooldown is skipped, next provider used', async () => {
      providerHealth.markFailed('mock1'); // Set provider1 on cooldown
      
      const provider1 = {
        name: 'mock1',
        createModel: () => ({
          invoke: jest.fn().mockResolvedValue({ content: 'should not be called' })
        })
      };
      const provider2 = {
        name: 'mock2',
        createModel: () => ({
          invoke: jest.fn().mockResolvedValue({ content: 'fallback' })
        })
      };
      getProviderChainSpy.mockReturnValue([provider1, provider2]);

      const result = await router.invoke('test prompt');
      expect(result.content).toBe('fallback');
    });
  });
});
