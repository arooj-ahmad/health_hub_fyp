/**
 * Gemini AI Provider
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses the Gemini REST API directly (no SDK dependency on backend).
 */

import config from '../../../config/index.js';

const { apiKey, model } = config.ai.gemini;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export async function generateResponse(prompt, options = {}) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const response = await fetch(
    `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: options.maxTokens || config.ai.maxTokens,
          temperature: options.temperature ?? config.ai.temperature,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function chat(messages, options = {}) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  // Convert messages to Gemini format
  const contents = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: options.maxTokens || config.ai.maxTokens,
          temperature: options.temperature ?? config.ai.temperature,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export const providerName = 'gemini';
