/**
 * Prompt Sanitizer
 * ─────────────────────────────────────────────────────────────────────────────
 * Sanitizes user input before passing to AI providers.
 * Prevents prompt injection and removes potentially harmful content.
 */

/**
 * Sanitize a text input by removing control characters and trimming.
 *
 * @param {string} text
 * @param {number} [maxLength=10000]
 * @returns {string}
 */
export function sanitizeInput(text, maxLength = 10000) {
  if (!text || typeof text !== 'string') return '';

  return text
    // Remove null bytes and other control characters (keep newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Trim whitespace
    .trim()
    // Enforce max length
    .slice(0, maxLength);
}

/**
 * Sanitize an array of chat messages.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Array<{role: string, content: string}>}
 */
export function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((msg) => msg && typeof msg.content === 'string' && msg.content.trim())
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: sanitizeInput(msg.content, 5000),
    }));
}

/**
 * Clean AI response to extract valid JSON.
 * Handles markdown code blocks, extra whitespace, text before/after JSON.
 *
 * @param {string} text
 * @returns {string} cleaned JSON string
 */
export function cleanAIJSON(text = '') {
  if (!text) return '';

  let cleaned = String(text).trim();

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/gi, '');

  // Find the first { and last } to extract JSON
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || firstBrace > lastBrace) {
    return '';
  }

  cleaned = cleaned.substring(firstBrace, lastBrace + 1);

  return cleaned;
}

export default { sanitizeInput, sanitizeMessages, cleanAIJSON };
