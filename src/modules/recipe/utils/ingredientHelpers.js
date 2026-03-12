/**
 * Ingredient Helpers — Utility functions for ingredient processing
 *
 * Contains:
 * - Pakistani ingredient context map
 * - Restriction builder from health conditions
 * - BMI / calorie helpers (read-only — NEVER modify backend values)
 * - Halal violation list
 */

// ============================================================================
// PAKISTANI INGREDIENT CONTEXT MAP
// ============================================================================

export const PAKISTANI_CONTEXT_MAP = {
  roti: 'whole wheat flatbread (roti)',
  chapati: 'whole wheat flatbread (chapati)',
  naan: 'naan bread',
  dahi: 'yogurt (dahi)',
  yogurt: 'yogurt (dahi)',
  sabzi: 'mixed vegetables (sabzi)',
  achar: 'pickle (achar)',
  ghee: 'clarified butter (ghee)',
  atta: 'whole wheat flour (atta)',
  maida: 'white flour (maida)',
  besan: 'chickpea flour (besan)',
  dal: 'lentils (dal)',
  daal: 'lentils (dal)',
  lentils: 'lentils (dal)',
  paneer: 'cottage cheese (paneer)',
  lassi: 'yogurt drink (lassi)',
  raita: 'yogurt side (raita)',
};

/**
 * Map an array of ingredients to their Pakistani kitchen context names.
 */
export const mapPakistaniContext = (ingredients) =>
  ingredients.map((ing) => {
    const lower = ing.toLowerCase().trim();
    return PAKISTANI_CONTEXT_MAP[lower] || ing;
  });

// ============================================================================
// HALAL VIOLATIONS
// ============================================================================

export const HALAL_VIOLATIONS = [
  'pork', 'bacon', 'ham', 'lard', 'alcohol', 'wine',
  'beer', 'rum', 'vodka', 'whiskey',
];

// ============================================================================
// HEALTH-CONDITION RESTRICTIONS
// ============================================================================

/**
 * Build a list of restricted ingredients from the user's medical conditions
 * and allergies.  This is a pure function with no side effects.
 */
export function buildRestrictions(conditions, allergies) {
  const restricted = [];
  const lc = (conditions || '').toLowerCase();
  const la = (allergies || '').toLowerCase();

  // Allergy-based
  if (la.includes('peanut'))                                        restricted.push('Peanuts / peanut oil');
  if (la.includes('shellfish') || la.includes('shrimp') || la.includes('prawn')) restricted.push('Shellfish / prawns');
  if (la.includes('gluten') || la.includes('wheat'))                restricted.push('Wheat / gluten products');
  if (la.includes('lactose') || la.includes('dairy') || la.includes('milk')) restricted.push('Dairy / milk products');
  if (la.includes('egg'))                                           restricted.push('Eggs');
  if (la.includes('soy'))                                           restricted.push('Soy products');

  // Condition-based
  if (lc.includes('diabetes') || lc.includes('sugar'))
    restricted.push('Refined sugar / sugary drinks', 'White rice (limit)', 'Maida (white flour)');
  if (lc.includes('blood pressure') || lc.includes('bp') || lc.includes('hypertension'))
    restricted.push('Excess salt / pickles (achar)', 'Processed / canned foods');
  if (lc.includes('cholesterol'))
    restricted.push('Deep-fried foods', 'Full-fat dairy', 'Red meat (limit)');
  if (lc.includes('kidney') || lc.includes('renal'))
    restricted.push('High-potassium foods (banana, potato – limit)', 'Excess protein');
  if (lc.includes('thyroid'))
    restricted.push('Soy-based products', 'Excess cruciferous raw vegetables');

  return [...new Set(restricted)];
}

// ============================================================================
// PROFILE COMPUTATION HELPERS
// (read-only; these are the same values the backend already computed)
// ============================================================================

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

export function calcCalories(w, h, age, gender, activity, goal) {
  if (!w || !h || !age) return null;
  const bmr =
    gender === 'female'
      ? 10 * w + 6.25 * h - 5 * age - 161
      : 10 * w + 6.25 * h - 5 * age + 5;
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, 'very-active': 1.9 };
  const tdee = bmr * (mult[activity] || 1.2);
  if (goal === 'Weight Loss') return Math.round(tdee - 500);
  if (goal === 'Weight Gain') return Math.round(tdee + 400);
  return Math.round(tdee);
}

/**
 * Derive all computed health-profile values from raw Firestore healthProfile.
 * Returns an object consumed by the recipe pipeline.
 */
export function deriveProfileComputed(healthProfile) {
  if (!healthProfile) return null;

  const w = parseFloat(healthProfile.weight);
  const h = parseFloat(healthProfile.height);
  const a = parseInt(healthProfile.age, 10);
  const g = healthProfile.gender || 'male';
  const act = healthProfile.activityLevel || 'sedentary';

  const bmi = calcBMI(w, h);
  const cat = bmiCategory(bmi);
  const goal = autoGoal(cat);
  const cal = calcCalories(w, h, a, g, act, goal);

  const conditions =
    [healthProfile.diabetes, healthProfile.heartConditions, healthProfile.bloodPressure]
      .filter((v) => v && v !== 'None' && v !== 'Normal')
      .join(', ') || 'None';

  const allergies = healthProfile.allergies || 'None';
  const restricted = buildRestrictions(conditions, allergies);

  return { bmi, cat, goal, cal, conditions, allergies, restricted, w, h, a, g };
}
