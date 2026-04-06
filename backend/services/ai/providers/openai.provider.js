/**
 * OpenAI Provider
 * ─────────────────────────────────────────────────────────────────────────────
 * Standard OpenAI Chat Completions API implementation.
 */

import config from '../../../config/index.js';

const { apiKey, model, baseUrl } = config.ai.openai;

export async function generateResponse(prompt, options = {}) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

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
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function chat(messages, options = {}) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

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
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export const providerName = 'openai';
