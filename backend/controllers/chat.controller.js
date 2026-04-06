/**
 * Chat Controller — v2 (Data-Aware)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pipeline: Normalize → Validate → RAG hooks → AI Chat → Schema Validate → Log → Respond
 */

import { chatWithAI } from '../services/ai/aiService.js';
import { buildContext } from '../services/rag/contextBuilder.js';
import { retrieve } from '../services/rag/retrievalLayer.js';
import { injectMetadata } from '../services/rag/metadataInjector.js';
import { success, error, send } from '../utils/responseFormatter.js';
import { validateChatResponse } from '../utils/schemaValidator.js';
import { logGeneration, createTimer } from '../services/logging/aiLogger.js';

const SYSTEM_CONTEXT = {
  role: 'user',
  content: `You are an AI medical assistant. ONLY respond to medical, health, nutrition, lab, medication, or exercise related queries. If the user asks anything outside these domains (finance, coding, entertainment, politics, etc.), reply briefly: 'I'm sorry, I can only answer medical and health-related questions.' Always include a disclaimer to consult a licensed healthcare professional for diagnosis and treatment. Be concise, empathetic, and cite general best-practice steps when appropriate.`,
};

export async function handleChat(req, res) {
  const timer = createTimer();

  try {
    const n = req.normalizedBody;
    const rawInput = req.body;

    if (!n || !n.messages || n.messages.length === 0) {
      return send(res, error('Missing or empty messages array', 400));
    }

    const userId = req.user?.uid || 'anonymous';
    const lastMessage = n.messages[n.messages.length - 1];

    // ── RAG hooks ──
    const context = await buildContext({ userId, type: 'chat' });
    const retrievedDocs = await retrieve({ query: lastMessage.content, type: 'chat' });

    let systemPrompt = SYSTEM_CONTEXT;
    if (context || retrievedDocs.length > 0) {
      const enrichedContent = injectMetadata({
        prompt: SYSTEM_CONTEXT.content, context, retrievedDocs,
      });
      systemPrompt = { role: 'user', content: enrichedContent };
    }

    // ── Call AI ──
    const aiResponse = await chatWithAI({
      messages: [systemPrompt, ...n.messages], type: 'chat', userId,
    });

    const responseData = {
      content: aiResponse?.success
        ? aiResponse.content || ''
        : "I apologize, but I'm having trouble processing your request right now. Please try again later or consult with a healthcare professional for immediate assistance.",
    };

    // ── Schema validation ──
    const validation = validateChatResponse(responseData);
    const latencyMs = timer.stop();

    // ── Async logging ──
    logGeneration({
      userId, type: 'chat', rawInput, normalizedInput: n,
      systemComputed: {},
      latencyMs,
      success: aiResponse?.success || false,
      error: aiResponse?.success ? null : (aiResponse?.error || 'AI chat failed'),
      outputPreview: (validation.data?.content || '').substring(0, 500),
      metadata: {
        messageCount: n.messages.length,
        lastMessageLength: lastMessage.content.length,
        validationErrors: validation.errors,
      },
    });

    return send(res, success(validation.data));

  } catch (err) {
    const latencyMs = timer.stop();
    logGeneration({
      userId: req.user?.uid || 'anonymous', type: 'chat',
      rawInput: req.body, normalizedInput: req.normalizedBody || {},
      systemComputed: {}, latencyMs, success: false,
      error: err.message, outputPreview: '',
    });
    console.error('[chat] Unhandled error:', err);
    return send(res, error('Chat service unavailable. Please try again later.'));
  }
}
