/**
 * LabAnalyzerService.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Sends the built prompt to Groq (or the configured AI provider) via the
 * existing aiService and returns the AI response.
 * Also provides a helper to extract text from an uploaded PDF using pdf.js
 * (falls back to an empty string when the library is not available).
 */

import { generateAIResponse, generateAIResponseWithImage } from '@/services/aiService';
import { buildLabPrompt, computeSystemValues } from './LabDietPrompt';

// ── Vite-compatible pdf.js imports ───────────────────────────────────────────
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

// Set the worker source once at module load (Vite resolves the ?url import
// to a static asset URL that works in both dev and production builds).
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ── PDF text extraction ──────────────────────────────────────────────────────

/**
 * Extract text content from a PDF File object using pdf.js.
 * - For image files we return '' (handled via the vision model later).
 * - Loops through every page, joins text items, and returns the combined text.
 *
 * @param {File} file
 * @returns {Promise<string>} extracted text (may be empty)
 */
export async function extractPdfText(file) {
  if (!file) return '';

  // Image files → will be handled via vision model in analyzeLabReport
  if (file.type.startsWith('image/')) return '';

  try {
    // Convert File → ArrayBuffer → pdf.js document
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item) => item.str).join(' ') + '\n';
    }

    const extractedText = fullText.trim();

    // Debug log so developers can verify extraction in the console
    console.log('Extracted PDF Text:', extractedText);

    if (!extractedText) {
      console.warn(
        'PDF appears to be a scanned image. Text extraction may require OCR.'
      );
    }

    return extractedText;
  } catch (err) {
    console.error('PDF text extraction failed:', err);
    return '';
  }
}

// ── Main analysis entry-point ────────────────────────────────────────────────

/**
 * Analyse a lab report using the AI.
 *
 * @param {Object} opts
 * @param {'MANUAL'|'PDF'} opts.labMode
 * @param {Object}          opts.labValues     manual form values
 * @param {string}          opts.pdfText       already-extracted PDF text
 * @param {File|null}       opts.file          uploaded file (image/pdf)
 * @param {Object}          opts.healthProfile raw healthProfile from Firestore
 * @returns {Promise<{aiResponse: string, riskLevel: string, sys: Object}>}
 */
export async function analyzeLabReport({ labMode, labValues, pdfText, file, healthProfile }) {
  const sys = computeSystemValues(healthProfile);

  const prompt = buildLabPrompt({ labMode, labValues, pdfText, sys });

  let aiResponse = '';

  try {
    let result = null;

    if (labMode === 'PDF' && file) {
      if (file.type.startsWith('image/')) {
        // Use vision model for images
        result = await generateAIResponseWithImage(prompt, file);
      } else {
        // Non-image PDF — text was already extracted; fallback to text prompt
        result = await generateAIResponse(
          pdfText
            ? prompt
            : prompt +
                '\n\nNote: The user uploaded a PDF file but text extraction was not available. ' +
                'Please advise them to upload a clear photo/scan of their lab report for better results.'
        );
      }
    } else {
      result = await generateAIResponse(prompt);
    }

    // Handle new safe response format
    if (result?.success) {
      aiResponse = result.content || 'Lab analysis could not be completed. Please try again.';
    } else {
      console.warn('AI lab analysis failed:', result?.error);
      aiResponse = 'Lab analysis service is temporarily unavailable. Please try again later or contact support.';
    }
  } catch (error) {
    console.warn('Lab analysis error:', error.message);
    aiResponse = 'Lab analysis service is temporarily unavailable. Please try again later or contact support.';
  }

  // Derive risk level from response text
  let riskLevel = 'low';
  const lower = aiResponse.toLowerCase();
  if (
    lower.includes('high risk') ||
    lower.includes('⚠') ||
    lower.includes('alert') ||
    lower.includes('danger')
  ) {
    riskLevel = 'high';
  } else if (
    lower.includes('slightly high') ||
    lower.includes('borderline') ||
    lower.includes('caution') ||
    lower.includes('slightly low')
  ) {
    riskLevel = 'medium';
  }

  return { aiResponse, riskLevel, sys };
}
