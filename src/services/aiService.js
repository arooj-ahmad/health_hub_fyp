/**
 * AI Service — Backend API Client
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the REPLACEMENT for the old client-side AI service.
 * 
 * BEFORE: Called Groq/Gemini/OpenAI APIs directly from the browser (INSECURE)
 * NOW:    Proxies all AI requests through the HealthHub backend (SECURE)
 *
 * The public API is IDENTICAL to the old service:
 *   - generateAIResponse(prompt, context)   → { success, content, error }
 *   - generateAIResponseWithImage(prompt, imageFile) → { success, content, error }
 *   - chatWithAI(messages)                  → { success, content, error }
 *   - getCurrentProvider()                  → string
 *
 * This means all existing imports continue to work without changes.
 */

import { getAuth } from 'firebase/auth';

// ── Backend URL ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Helper: get Firebase ID token for auth header ───────────────────────────

async function getAuthToken() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      console.warn('[aiService] No authenticated user — requests may fail');
      return null;
    }
    return await user.getIdToken();
  } catch (err) {
    console.warn('[aiService] Failed to get auth token:', err.message);
    return null;
  }
}

/**
 * Make an authenticated request to the backend.
 */
async function backendFetch(endpoint, body) {
  const token = await getAuthToken();

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || `Backend error: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// =============================================================================
// PUBLIC API — Same interface as the old service
// =============================================================================

/**
 * Generate an AI response for a given prompt.
 * Routes through: POST /api/chat (single-message mode)
 *
 * @param {string} prompt - The prompt to send to the AI
 * @param {string} context - Optional context to prepend to the prompt
 * @returns {Promise<{success: boolean, content: string, error?: string}>}
 */
export const generateAIResponse = async (prompt, context = '') => {
  try {
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

    const data = await backendFetch('/api/chat', {
      messages: [{ role: 'user', content: fullPrompt }],
    });

    // Backend returns { success, data: { content } }
    if (data?.success && data?.data?.content) {
      return {
        success: true,
        content: data.data.content,
      };
    }

    return {
      success: false,
      content: '',
      error: data?.error || 'No content in response',
    };
  } catch (error) {
    console.warn('AI Service error:', error.message);
    return {
      success: false,
      content: '',
      error: error.message || 'AI service failed',
    };
  }
};

/**
 * Generate an AI response for a prompt with an image.
 * NOTE: Image analysis currently falls back to text-only prompt
 * since the backend doesn't handle file uploads yet.
 *
 * @param {string} prompt - The prompt to send to the AI
 * @param {File} imageFile - The image file (currently unused, text extraction happens client-side)
 * @returns {Promise<{success: boolean, content: string, error?: string}>}
 */
export const generateAIResponseWithImage = async (prompt, imageFile) => {
  // For now, fall back to text-only generation
  // Future: implement multipart upload to backend
  console.warn('[aiService] Image upload not yet supported by backend — using text-only mode');
  return await generateAIResponse(prompt);
};

/**
 * Have a conversation with the AI.
 * Routes through: POST /api/chat
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{success: boolean, content: string, error?: string}>}
 */
export const chatWithAI = async (messages) => {
  try {
    const data = await backendFetch('/api/chat', { messages });

    if (data?.success && data?.data?.content) {
      return {
        success: true,
        content: data.data.content,
      };
    }

    return {
      success: false,
      content: '',
      error: data?.error || 'No content in response',
    };
  } catch (error) {
    console.warn('AI Chat error:', error.message);
    return {
      success: false,
      content: '',
      error: error.message || 'AI chat failed',
    };
  }
};

/**
 * Get the current AI provider name.
 * Now returns 'backend' since the provider is configured server-side.
 */
export const getCurrentProvider = () => 'backend';

/**
 * Get list of supported AI providers.
 */
export const getSupportedProviders = () => ['backend'];
