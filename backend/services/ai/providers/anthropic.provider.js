/**
 * Anthropic AI Provider
 * ─────────────────────────────────────────────────────────────────────────────
 * Claude Messages API implementation.
 */

import config from '../../../config/index.js';

const { apiKey, model } = config.ai.anthropic;
const BASE_URL = 'https://api.anthropic.com/v1';

export async function generateResponse(prompt, options = {}) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const response = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens || config.ai.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function chat(messages, options = {}) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const formattedMessages = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));

  const response = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens || config.ai.maxTokens,
      messages: formattedMessages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export const providerName = 'anthropic';
