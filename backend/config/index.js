/**
 * Centralized Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Loads environment variables via dotenv and exports a single config object.
 * Every module imports config from here — never reads process.env directly.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '..', '.env') });

const config = {
  // ── Server ──────────────────────────────────────────────────────────────
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // ── AI Provider ─────────────────────────────────────────────────────────
  ai: {
    provider: (process.env.AI_PROVIDER || 'groq').toLowerCase(),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS, 10) || 2500,
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.4,
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS, 10) || 30000,

    groq: {
      apiKey: process.env.GROQ_API_KEY || '',
      model: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
      baseUrl: 'https://api.groq.com/openai/v1',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4',
      baseUrl: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
    },
  },

  // ── Firebase ────────────────────────────────────────────────────────────
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : resolve(__dirname, 'serviceAccountKey.json'),
  },

  // ── CORS ────────────────────────────────────────────────────────────────
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
      .split(',')
      .map((s) => s.trim()),
  },
};

// ── Validation ──────────────────────────────────────────────────────────────

function validateConfig() {
  const provider = config.ai.provider;
  const providerConfig = config.ai[provider];

  if (!providerConfig) {
    console.error(`❌ Unknown AI provider: "${provider}". Supported: groq, openai, gemini, anthropic`);
    process.exit(1);
  }

  if (!providerConfig.apiKey) {
    console.warn(`⚠️  ${provider.toUpperCase()}_API_KEY is not set. AI features will fail.`);
  } else {
    console.log(`✓ AI Provider configured: ${provider}`);
  }
}

validateConfig();

export default config;
