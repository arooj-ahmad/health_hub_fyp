/**
 * Response Formatter
 * ─────────────────────────────────────────────────────────────────────────────
 * Ensures every API response follows the same structure:
 *   { success: boolean, data?: any, error?: string }
 */

/**
 * Create a success response.
 */
export function success(data, statusCode = 200) {
  return { statusCode, body: { success: true, data } };
}

/**
 * Create an error response.
 */
export function error(message, statusCode = 500) {
  return { statusCode, body: { success: false, error: message } };
}

/**
 * Send a formatted response through Express res object.
 */
export function send(res, { statusCode, body }) {
  return res.status(statusCode).json(body);
}

export default { success, error, send };
