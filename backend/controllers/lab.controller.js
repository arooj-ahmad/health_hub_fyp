/**
 * Lab Report Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates lab report analysis:
 *   Request → Validate → (RAG hooks) → Build prompt → AI Service → Parse risk → Respond
 *
 * Ported from: src/modules/labReport/LabAnalyzerService.js
 *
 * NOTE: Image/PDF uploads are NOT handled here yet. The frontend still does
 * PDF text extraction client-side and sends the extracted text. Future work
 * can add multer for direct file upload handling on the backend.
 */

import { generateAIResponse } from '../services/ai/aiService.js';
import { buildContext } from '../services/rag/contextBuilder.js';
import { retrieve } from '../services/rag/retrievalLayer.js';
import { injectMetadata } from '../services/rag/metadataInjector.js';
import { sanitizeInput } from '../utils/promptSanitizer.js';
import { success, error, send } from '../utils/responseFormatter.js';

// ── Compute system values (ported from LabDietPrompt.js) ────────────────────

function computeSystemValues(healthProfile = {}) {
  const weight = parseFloat(healthProfile.weight) || 70;
  const height = parseFloat(healthProfile.height) || 170;
  const age = parseInt(healthProfile.age, 10) || 30;
  const gender = (healthProfile.gender || 'male').toLowerCase();

  const heightM = height / 100;
  const bmi = (weight / (heightM * heightM)).toFixed(1);

  let bmiCategory = 'Normal';
  if (bmi < 18.5) bmiCategory = 'Underweight';
  else if (bmi < 25) bmiCategory = 'Normal';
  else if (bmi < 30) bmiCategory = 'Overweight';
  else bmiCategory = 'Obese';

  // BMR (Mifflin-St Jeor)
  let bmr;
  if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }

  return { weight, height, age, gender, bmi: parseFloat(bmi), bmiCategory, bmr: Math.round(bmr) };
}

// ── Build lab analysis prompt ───────────────────────────────────────────────

function buildLabPrompt({ labMode, labValues, pdfText, sys }) {
  const profileSection = `USER HEALTH PROFILE:
Age: ${sys.age} | Gender: ${sys.gender}
Height: ${sys.height} cm | Weight: ${sys.weight} kg
BMI: ${sys.bmi} (${sys.bmiCategory})
BMR: ${sys.bmr} kcal/day`;

  let labDataSection = '';

  if (labMode === 'MANUAL' && labValues) {
    const entries = Object.entries(labValues)
      .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    labDataSection = `LAB VALUES (manually entered):\n${entries}`;
  } else if (labMode === 'PDF' && pdfText) {
    labDataSection = `LAB REPORT TEXT (extracted from PDF):\n${pdfText}`;
  } else {
    labDataSection = 'No lab data provided.';
  }

  return `You are an advanced AI Lab Report Analyzer for SmartNutrition Pakistan.

${profileSection}

${labDataSection}

ANALYSIS REQUIREMENTS:
1. Analyze each lab value against standard reference ranges
2. Flag any values that are outside normal ranges
3. Explain what each abnormal value means in simple language
4. Provide dietary recommendations based on the results
5. Consider the user's BMI and overall health profile
6. ALL dietary suggestions must be HALAL and use Pakistani foods
7. Include a risk assessment: Low / Medium / High
8. Always include a disclaimer to consult a healthcare professional

Provide your analysis in a clear, organized format with sections:
- Summary
- Detailed Analysis (for each lab value)
- Dietary Recommendations
- Risk Level
- Disclaimer`;
}

export async function analyzeLabReport(req, res) {
  try {
    const { labMode, labValues, pdfText, healthProfile } = req.body;

    // ── Validate ──
    if (!labMode) {
      return send(res, error('Missing labMode (MANUAL or PDF)', 400));
    }

    if (labMode === 'MANUAL' && (!labValues || Object.keys(labValues).length === 0)) {
      return send(res, error('Missing lab values for manual mode', 400));
    }

    if (labMode === 'PDF' && !pdfText) {
      return send(res, error('Missing pdfText for PDF mode. Extract text client-side before sending.', 400));
    }

    const userId = req.user?.uid || 'anonymous';
    const sys = computeSystemValues(healthProfile);

    // ── RAG hooks ──
    const context = await buildContext({ userId, type: 'lab' });
    const retrievedDocs = await retrieve({ query: 'lab report analysis', type: 'lab' });

    // ── Build prompt ──
    const rawPrompt = buildLabPrompt({
      labMode,
      labValues,
      pdfText: sanitizeInput(pdfText || '', 20000),
      sys,
    });
    const prompt = injectMetadata({ prompt: rawPrompt, context, retrievedDocs });

    // ── Call AI ──
    const aiResponse = await generateAIResponse({
      prompt,
      type: 'lab',
      userId,
      options: { maxTokens: 3000 },
    });

    let aiContent = '';
    if (aiResponse?.success) {
      aiContent = aiResponse.content || 'Lab analysis could not be completed. Please try again.';
    } else {
      aiContent = 'Lab analysis service is temporarily unavailable. Please try again later.';
    }

    // ── Derive risk level ──
    let riskLevel = 'low';
    const lower = aiContent.toLowerCase();
    if (lower.includes('high risk') || lower.includes('⚠') || lower.includes('alert') || lower.includes('danger')) {
      riskLevel = 'high';
    } else if (lower.includes('slightly high') || lower.includes('borderline') || lower.includes('caution') || lower.includes('slightly low')) {
      riskLevel = 'medium';
    }

    return send(res, success({
      aiResponse: aiContent,
      riskLevel,
      systemValues: sys,
    }));
  } catch (err) {
    console.error('[lab] Unhandled error:', err);
    return send(res, error('Lab analysis failed. Please try again later.'));
  }
}
