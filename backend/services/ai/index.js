/**
 * AI Provider Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps provider names to their implementations.
 * Each provider must export: generateResponse(prompt, options) and chat(messages, options)
 */

import * as groq from './providers/groq.provider.js';
import * as openai from './providers/openai.provider.js';
import * as gemini from './providers/gemini.provider.js';
import * as anthropic from './providers/anthropic.provider.js';

const providers = {
  groq,
  openai,
  gemini,
  anthropic,
};

/**
 * Get a provider by name.
 * @param {string} name
 * @returns {{ generateResponse: Function, chat: Function }}
 */
export function getProvider(name) {
  const provider = providers[name];
  if (!provider) {
    throw new Error(
      `Unknown AI provider: "${name}". Supported: ${Object.keys(providers).join(', ')}`
    );
  }
  return provider;
}

export function getSupportedProviders() {
  return Object.keys(providers);
}

export default providers;
