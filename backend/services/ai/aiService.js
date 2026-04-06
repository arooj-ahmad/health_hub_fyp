/**
 * Unified AI Service
 * ─────────────────────────────────────────────────────────────────────────────
 * THE central function that all controllers call. Handles:
 *   - Provider selection
 *   - Timeout enforcement
 *   - Error handling
 *   - Standard response format: { success, content, error }
 *
 * RAG-READY: The pipeline is designed so that context enrichment (retrieval)
 * can be inserted BEFORE this function is called — the controller calls
 * contextBuilder → retrievalLayer → then passes enriched prompt here.
 */

import config from '../../config/index.js';
import { getProvider } from './index.js';

/**
 * Generate an AI response with full error handling and timeout.
 *
 * @param {object} params
 * @param {string} params.prompt     - The prompt to send to the AI
 * @param {string} [params.type]     - Request type for logging: 'diet' | 'recipe' | 'chat' | 'lab'
 * @param {string} [params.userId]   - User ID for audit trail
 * @param {object} [params.options]  - Override maxTokens, temperature
 * @returns {Promise<{ success: boolean, content: string, error?: string }>}
 */
export async function generateAIResponse({ prompt, type = 'general', userId = 'anonymous', options = {} }) {
  const providerName = config.ai.provider;

  try {
    const provider = getProvider(providerName);

    // Wrap in timeout
    const result = await withTimeout(
      provider.generateResponse(prompt, options),
      config.ai.timeoutMs
    );

    // RAG-READY: Log successful generation for future quality evaluation
    // logGeneration({ type, userId, providerName, promptLength: prompt.length, responseLength: result.length });

    return {
      success: true,
      content: result || '',
    };
  } catch (error) {
    console.warn(`[aiService] ${providerName} error (${type}, user:${userId}):`, error.message);

    return {
      success: false,
      content: '',
      error: error.message || 'AI service failed',
    };
  }
}

/**
 * Multi-turn AI chat with full error handling and timeout.
 *
 * @param {object} params
 * @param {Array<{role: string, content: string}>} params.messages
 * @param {string} [params.type]
 * @param {string} [params.userId]
 * @param {object} [params.options]
 * @returns {Promise<{ success: boolean, content: string, error?: string }>}
 */
export async function chatWithAI({ messages, type = 'chat', userId = 'anonymous', options = {} }) {
  const providerName = config.ai.provider;

  try {
    const provider = getProvider(providerName);

    const result = await withTimeout(
      provider.chat(messages, options),
      config.ai.timeoutMs
    );

    return {
      success: true,
      content: result || '',
    };
  } catch (error) {
    console.warn(`[aiService] ${providerName} chat error (${type}, user:${userId}):`, error.message);

    return {
      success: false,
      content: '',
      error: error.message || 'AI chat failed',
    };
  }
}

/**
 * Get current provider name.
 */
export function getCurrentProvider() {
  return config.ai.provider;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Wraps a promise with a timeout.
 */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`AI request timed out after ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
