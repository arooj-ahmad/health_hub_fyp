/**
 * Groq AI Provider
 * ─────────────────────────────────────────────────────────────────────────────
 * OpenAI-compatible API implementation for Groq.
 * This is the primary provider used by HealthHub.
 */

import config from '../../../config/index.js';

const { apiKey, model, baseUrl } = config.ai.groq;

/**
 * Generate a text completion via Groq.
 *
 * @param {string} prompt  - The full prompt to send
 * @param {object} options - { maxTokens, temperature }
 * @returns {Promise<string>} The AI-generated text content
 */
export async function generateResponse(prompt, options = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured');

  const maxTokens = options.maxTokens || config.ai.maxTokens;
  const temperature = options.temperature ?? config.ai.temperature;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Groq API error: ${errorMessage}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Multi-turn chat completion via Groq.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options - { maxTokens, temperature }
 * @returns {Promise<string>} The AI-generated reply
 */
export async function chat(messages, options = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured');

  const maxTokens = options.maxTokens || config.ai.maxTokens;
  const temperature = options.temperature ?? config.ai.temperature;

  const formattedMessages = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Groq API error: ${errorMessage}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export const providerName = 'groq';
