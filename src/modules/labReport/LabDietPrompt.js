/**
 * LabDietPrompt.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Builds the advanced AI prompt for lab-report analysis & food recommendations.
 * The prompt instructs the AI to detect panels, extract values, flag risks,
 * provide health insights, recommend / limit / avoid foods (Pakistani halal),
 * and add lifestyle tips — WITHOUT diagnosing disease or prescribing medicines.
 */

// ── Helpers (shared formulae) ────────────────────────────────────────────────

export function calcBMI(w, h) {
  if (!w || !h || h <= 0) return null;
  return parseFloat((w / ((h / 100) ** 2)).toFixed(1));
}

export function bmiCategory(bmi) {
  if (!bmi) return '';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function autoGoal(cat) {
  if (cat === 'Underweight') return 'Weight Gain';
  if (cat === 'Normal') return 'Maintenance';
  return 'Weight Loss';
}

export function targetWeight(h, cat) {
  if (!h) return null;
  const m = h / 100;
  if (cat === 'Underweight') return parseFloat((18.5 * m * m).toFixed(1));
  if (cat === 'Normal') return null;
  return parseFloat((24.9 * m * m).toFixed(1));
}

export function calcCalories(w, h, a, g, act, goal) {
  if (!w || !h || !a) return null;
  const bmr =
    g === 'female'
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5;
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, 'very-active': 1.9 };
  const tdee = bmr * (mult[act] || 1.2);
  if (goal === 'Weight Loss') return Math.round(tdee - 500);
  if (goal === 'Weight Gain') return Math.round(tdee + 400);
  return Math.round(tdee);
}

// ── Compute system values from a health-profile object ───────────────────────

export function computeSystemValues(hp) {
  if (!hp) return {};
  const w = parseFloat(hp.weight);
  const h = parseFloat(hp.height);
  const a = parseInt(hp.age, 10);
  const g = hp.gender || 'male';
  const act = hp.activityLevel || 'sedentary';
  const bmi = calcBMI(w, h);
  const cat = bmiCategory(bmi);
  const goal = autoGoal(cat);
  const tw = targetWeight(h, cat);
  const cal = calcCalories(w, h, a, g, act, goal);
  const allergies = hp.allergies || 'None';
  return { w, h, a, g, act, bmi, cat, goal, tw, cal, allergies };
}

// ── Format manual lab values into a text block ───────────────────────────────

export function formatManualLabValues(labValues) {
  const lines = [];
  const add = (label, val, unit) => {
    if (val) lines.push(`${label}: ${val} ${unit}`);
  };
  add('Fasting Blood Sugar', labValues.fastingSugar, 'mg/dL');
  add('Random Blood Sugar', labValues.randomSugar, 'mg/dL');
  add('HbA1c', labValues.hba1c, '%');
  add('Total Cholesterol', labValues.totalCholesterol, 'mg/dL');
  add('LDL', labValues.ldl, 'mg/dL');
  add('HDL', labValues.hdl, 'mg/dL');
  add('Triglycerides', labValues.triglycerides, 'mg/dL');
  add('Hemoglobin', labValues.hemoglobin, 'g/dL');
  add('Vitamin D', labValues.vitaminD, 'ng/mL');
  add('Uric Acid', labValues.uricAcid, 'mg/dL');
  add('Creatinine', labValues.creatinine, 'mg/dL');
  add('TSH', labValues.tsh, 'mIU/L');
  add('Blood Pressure', labValues.bloodPressure, 'mmHg');
  return lines.join('\n');
}

// ── Build the full prompt ────────────────────────────────────────────────────

/**
 * @param {Object} opts
 * @param {'MANUAL'|'PDF'} opts.labMode
 * @param {Object}         opts.labValues      manual lab values object
 * @param {string}         opts.pdfText         extracted PDF text (if any)
 * @param {Object}         opts.sys             computed system values from computeSystemValues()
 */
export function buildLabPrompt({ labMode, labValues, pdfText, sys }) {
  const { w, h, a, g, act, bmi, cat, goal, tw, cal, allergies } = sys;
  const manualBlock = labMode === 'MANUAL' ? formatManualLabValues(labValues) : '';

  return `You are an advanced AI Health & Lab Report Analysis Assistant for SmartNutrition Pakistan.

Your job is to analyze lab reports and provide **healthy food recommendations**.

IMPORTANT RULES:

You must NOT:
- Generate a full diet plan
- Create meal schedules
- Provide medical diagnosis
- Prescribe medicines
- Recalculate BMI
- Change the goal
- Modify calorie target

Only provide **safe food recommendations and lifestyle guidance**.

--------------------------------------------------

USER PROFILE:

Age: ${a}
Gender: ${g}
Height: ${h} cm
Weight: ${w} kg
BMI: ${bmi}
BMI Category: ${cat}
Goal: ${goal}
Target Weight: ${tw ? tw + ' kg' : 'Already in normal range'}
Calories: ${cal} kcal/day
Activity Level: ${act}
Allergies: ${allergies}

--------------------------------------------------

LAB INPUT MODE: ${labMode}

${labMode === 'MANUAL' ? `MANUAL LAB VALUES (use ONLY these — ignore PDF text):

${manualBlock || 'No values provided.'}` : `PDF EXTRACTED TEXT (use ONLY this — ignore manual values):

${pdfText || 'No extracted text available.'}`}

--------------------------------------------------

YOUR TASK:

==============================
STEP 1 — Detect Lab Panels
==============================

Identify which lab panels are present:
- Diabetes Panel
- Lipid Profile
- Complete Blood Count (CBC)
- Thyroid Profile
- Kidney Function Test
- Liver Function Test
- Uric Acid Test
- Vitamin D Test
- Other

==============================
STEP 2 — Extract Lab Values
==============================

Extract numeric values from the selected source.
If a value is not available, mark it as: "Not Available"
Do NOT guess or fabricate values.

==============================
STEP 3 — Risk Detection
==============================

Detect risk phrases such as:
- "Risk of"
- "Prediabetic"
- "Borderline"
- "High cardiovascular risk"
- "At risk"
- "Stage 1"
- "Stage 2"

If such phrases are found:
- Mention exact phrase found
- Explain in simple language what it means
- Strongly suggest consulting a doctor
- Do NOT confirm any disease

==============================
STEP 4 — Health Insights
==============================

1) Compare extracted numeric values with general adult reference ranges.
2) Categorize each as:
   - Normal
   - Slightly High / Slightly Low
   - High Risk
3) Explain abnormal values in simple English.
4) Do NOT say "You have [disease]".
5) If any value is very high risk → clearly recommend medical consultation.

==============================
STEP 5 — Food Recommendations
==============================

Provide the following sections:

✔ **Recommended Healthy Foods**
Foods that support the user's health based on lab markers.

✔ **Foods to Limit**
Foods that should be consumed in moderation.

✔ **Foods to Avoid**
Foods that should be strictly avoided.

✔ **Healthy Pakistani Food Suggestions**
Use common, affordable, halal Pakistani foods.

Examples:
- Fresh vegetables and salads
- Whole grains (brown rice, whole wheat roti)
- Lentils (daal) and legumes
- Lean chicken (grilled/baked)
- Fish (grilled)
- Low glycemic fruits (guava, apple, pear)
- Yogurt / lassi (low fat)

==============================
STEP 6 — Diet Adjustment Based on Lab Markers
==============================

Adjust recommendations based on abnormal markers:
- High Blood Sugar → Low glycemic foods, reduce sugar
- High Cholesterol → High fiber foods, reduce saturated fat
- Low Hemoglobin → Iron-rich foods (spinach, liver, dates)
- Low Vitamin D → Vitamin D foods (eggs, fortified milk, sunlight)
- High Uric Acid → Reduce red meat, organ meats, limit lentils
- Kidney Issues → Moderate protein, low sodium

==============================
STEP 7 — Lifestyle Suggestions
==============================

Provide 4–6 simple lifestyle suggestions suitable for Pakistani routine:
- Daily walking (30 min)
- Drink 8–10 glasses of water
- Get 7–8 hours of sleep
- Reduce sugar and processed food intake
- Limit deep-fried foods
- Add fresh salad to every meal

==============================
STEP 8 — Disclaimer
==============================

End your response with exactly this:

"This analysis and dietary suggestions are for educational purposes only and do not replace professional medical advice or doctor consultation."`;
}
