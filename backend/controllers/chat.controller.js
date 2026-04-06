/**
 * Chat Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates AI chatbot (AI Doctor) conversations:
 *   Request → Validate → (RAG hooks) → Inject system prompt → AI Chat → Respond
 *
 * Ported from: src/pages/AIDoctor.jsx
 */

import { chatWithAI } from '../services/ai/aiService.js';
import { buildContext } from '../services/rag/contextBuilder.js';
import { retrieve } from '../services/rag/retrievalLayer.js';
import { injectMetadata } from '../services/rag/metadataInjector.js';
import { sanitizeMessages } from '../utils/promptSanitizer.js';
import { success, error, send } from '../utils/responseFormatter.js';

// ── System context for medical AI assistant ─────────────────────────────────

const SYSTEM_CONTEXT = {
  role: 'user',
  content: `You are an AI medical assistant. ONLY respond to medical, health, nutrition, lab, medication, or exercise related queries. If the user asks anything outside these domains (finance, coding, entertainment, politics, etc.), reply briefly: 'I'm sorry, I can only answer medical and health-related questions.' Always include a disclaimer to consult a licensed healthcare professional for diagnosis and treatment. Be concise, empathetic, and cite general best-practice steps when appropriate.`,
};

export async function handleChat(req, res) {
  try {
    const { messages } = req.body;

    // ── Validate ──
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return send(res, error('Missing or empty messages array', 400));
    }

    const userId = req.user?.uid || 'anonymous';

    // ── Sanitize messages ──
    const sanitized = sanitizeMessages(messages);
    if (sanitized.length === 0) {
      return send(res, error('No valid messages provided', 400));
    }

    // ── RAG hooks ──
    const lastMessage = sanitized[sanitized.length - 1];
    const context = await buildContext({ userId, type: 'chat' });
    const retrievedDocs = await retrieve({ query: lastMessage.content, type: 'chat' });

    // ── Inject context into system prompt if available ──
    let systemPrompt = SYSTEM_CONTEXT;
    if (context || retrievedDocs.length > 0) {
      const enrichedContent = injectMetadata({
        prompt: SYSTEM_CONTEXT.content,
        context,
        retrievedDocs,
      });
      systemPrompt = { role: 'user', content: enrichedContent };
    }

    // ── Call AI chat ──
    const aiResponse = await chatWithAI({
      messages: [systemPrompt, ...sanitized],
      type: 'chat',
      userId,
    });

    if (!aiResponse?.success) {
      return send(res, success({
        content: "I apologize, but I'm having trouble processing your request right now. Please try again later or consult with a healthcare professional for immediate assistance.",
      }));
    }

    // ── Firestore save placeholder ──
    // await firestoreService.saveChatMessage(userId, { role: 'user', content: lastMessage.content });
    // await firestoreService.saveChatMessage(userId, { role: 'assistant', content: aiResponse.content });

    return send(res, success({
      content: aiResponse.content || "I apologize, but I'm having trouble processing your request right now.",
    }));
  } catch (err) {
    console.error('[chat] Unhandled error:', err);
    return send(res, error('Chat service unavailable. Please try again later.'));
  }
}
