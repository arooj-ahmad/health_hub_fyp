/**
 * AI Service - Generalized AI Provider Interface
 * 
 * This service provides a unified interface for multiple AI providers.
 * Configure your preferred provider in the .env file using VITE_AI_PROVIDER.
 * 
 * Supported providers:
 * - gemini (Google Generative AI)
 * - openai (OpenAI)
 * - anthropic (Anthropic Claude)
 * 
 * To add a new provider:
 * 1. Add the provider configuration in .env.example
 * 2. Implement the provider-specific functions in this file
 * 3. Register the provider in the providers object
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Get current AI provider from environment
const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'gemini';

// Validate API keys on startup
const validateAPIKeys = () => {
  const provider = AI_PROVIDER.toLowerCase();
  
  switch (provider) {
    case 'gemini':
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        console.error('⚠️ VITE_GEMINI_API_KEY missing - AI features disabled');
        return false;
      }
      break;
    case 'openai':
      if (!import.meta.env.VITE_OPENAI_API_KEY) {
        console.error('⚠️ VITE_OPENAI_API_KEY missing - AI features disabled');
        return false;
      }
      break;
    case 'groq':
      if (!import.meta.env.VITE_GROQ_API_KEY) {
        console.error('⚠️ VITE_GROQ_API_KEY missing - AI features disabled');
        return false;
      }
      break;
    case 'anthropic':
      if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
        console.error('⚠️ VITE_ANTHROPIC_API_KEY missing - AI features disabled');
        return false;
      }
      break;
    default:
      console.warn(`⚠️ Unknown AI provider: ${provider}`);
      return false;
  }
  
  console.log(`✓ AI Provider configured: ${provider}`);
  return true;
};

// Run validation on module load
const isAIConfigured = validateAPIKeys();

// Provider-specific implementations
const providers = {
  gemini: {
    generateResponse: geminiGenerateResponse,
    generateResponseWithImage: geminiGenerateResponseWithImage,
    chat: geminiChat,
  },
  openai: {
    generateResponse: openaiGenerateResponse,
    generateResponseWithImage: openaiGenerateResponseWithImage,
    chat: openaiChat,
  },
  groq: {
    generateResponse: groqGenerateResponse,
    generateResponseWithImage: groqGenerateResponseWithImage,
    chat: groqChat,
  },
  anthropic: {
    generateResponse: anthropicGenerateResponse,
    generateResponseWithImage: anthropicGenerateResponseWithImage,
    chat: anthropicChat,
  },
};

// =============================================================================
// GEMINI PROVIDER IMPLEMENTATION
// =============================================================================

let genAI = null;
function getGeminiClient() {
  if (!genAI && import.meta.env.VITE_GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  }
  return genAI;
}

async function geminiGenerateResponse(prompt, context = '') {
  const client = getGeminiClient();
  if (!client) throw new Error('Gemini API key not configured');
  
  const model = client.getGenerativeModel({ 
    model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash-exp'
  });

  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  return response.text();
}

async function geminiGenerateResponseWithImage(prompt, imageFile) {
  const client = getGeminiClient();
  if (!client) throw new Error('Gemini API key not configured');
  
  const model = client.getGenerativeModel({ 
    model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash-exp'
  });

  const imageData = await fileToBase64(imageFile);
  const result = await model.generateContent([
    prompt, 
    { inlineData: { data: imageData, mimeType: imageFile.type } }
  ]);
  const response = await result.response;
  return response.text();
}

async function geminiChat(messages) {
  const client = getGeminiClient();
  if (!client) throw new Error('Gemini API key not configured');
  
  const model = client.getGenerativeModel({ 
    model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash-exp'
  });

  const chat = model.startChat({
    history: messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }))
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage.content);
  const response = await result.response;
  return response.text();
}

// =============================================================================
// OPENAI PROVIDER IMPLEMENTATION
// =============================================================================

async function openaiGenerateResponse(prompt, context = '') {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');
  
  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4';
  const baseUrl = import.meta.env.VITE_OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: fullPrompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function openaiGenerateResponseWithImage(prompt, imageFile) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');
  
  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4-vision-preview';
  const baseUrl = import.meta.env.VITE_OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
  const base64Image = await fileToBase64(imageFile);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${base64Image}` } }
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function openaiChat(messages) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');
  
  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4';
  const baseUrl = import.meta.env.VITE_OPENAI_API_BASE_URL || 'https://api.openai.com/v1';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// =============================================================================
// GROQ PROVIDER IMPLEMENTATION (OpenAI-compatible API)
// =============================================================================

async function groqGenerateResponse(prompt, context = '') {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key not configured');
  
  const model = import.meta.env.VITE_AI_MODEL || 'mixtral-8x7b-32768';
  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: fullPrompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function groqGenerateResponseWithImage(prompt, imageFile) {
  // Groq doesn't support image analysis yet, fallback to text-only
  console.warn('Groq does not support image analysis. Processing as text-only prompt.');
  return await groqGenerateResponse(prompt);
}

async function groqChat(messages) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key not configured');
  
  const model = import.meta.env.VITE_AI_MODEL || 'mixtral-8x7b-32768';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// =============================================================================
// ANTHROPIC PROVIDER IMPLEMENTATION
// =============================================================================

async function anthropicGenerateResponse(prompt, context = '') {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Anthropic API key not configured');
  
  const model = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-3-opus-20240229';
  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: fullPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function anthropicGenerateResponseWithImage(prompt, imageFile) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Anthropic API key not configured');
  
  const model = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-3-opus-20240229';
  const base64Image = await fileToBase64(imageFile);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image', source: { type: 'base64', media_type: imageFile.type, data: base64Image } }
        ],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function anthropicChat(messages) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Anthropic API key not configured');
  
  const model = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-3-opus-20240229';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getProvider() {
  const provider = providers[AI_PROVIDER];
  if (!provider) {
    throw new Error(`Unsupported AI provider: ${AI_PROVIDER}. Supported providers: ${Object.keys(providers).join(', ')}`);
  }
  return provider;
}

// =============================================================================
// PUBLIC API - Unified interface for all providers
// =============================================================================

/**
 * Generate an AI response for a given prompt
 * @param {string} prompt - The prompt to send to the AI
 * @param {string} context - Optional context to prepend to the prompt
 * @returns {Promise<string>} The AI's response
 */
export const generateAIResponse = async (prompt, context = '') => {
  try {
    const provider = getProvider();
    return await provider.generateResponse(prompt, context);
  } catch (error) {
    console.error(`AI Provider (${AI_PROVIDER}) Error:`, error);
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
};

/**
 * Generate an AI response for a prompt with an image
 * @param {string} prompt - The prompt to send to the AI
 * @param {File} imageFile - The image file to analyze
 * @returns {Promise<string>} The AI's response
 */
export const generateAIResponseWithImage = async (prompt, imageFile) => {
  try {
    const provider = getProvider();
    return await provider.generateResponseWithImage(prompt, imageFile);
  } catch (error) {
    console.error(`AI Provider (${AI_PROVIDER}) Error:`, error);
    throw new Error(`Failed to generate AI response with image: ${error.message}`);
  }
};

/**
 * Have a conversation with the AI
 * @param {Array<{role: string, content: string}>} messages - Array of messages in the conversation
 * @returns {Promise<string>} The AI's response
 */
export const chatWithAI = async (messages) => {
  try {
    const provider = getProvider();
    return await provider.chat(messages);
  } catch (error) {
    console.error(`AI Provider (${AI_PROVIDER}) Chat Error:`, error);
    throw new Error(`Failed to chat with AI: ${error.message}`);
  }
};

/**
 * Get the current AI provider name
 * @returns {string} The current provider name
 */
export const getCurrentProvider = () => AI_PROVIDER;

/**
 * Get list of supported AI providers
 * @returns {string[]} Array of supported provider names
 */
export const getSupportedProviders = () => Object.keys(providers);
