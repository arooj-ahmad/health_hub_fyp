/**
 * mealHelpers.js — Pakistani‑contextualised diet-planning helpers
 *
 * Pure utility functions used across the diet module.
 * Covers BMI maths, calorie targets, meal templates, health‑condition
 * adaptations, halal compliance, and allergy lists.
 */

// ── BMI & Calorie Helpers ────────────────────────────────────────────────────

export function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const hm = heightCm / 100;
  return parseFloat((weightKg / (hm * hm)).toFixed(1));
}

export function bmiCategory(bmi) {
  if (bmi == null) return '';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function autoGoal(cat) {
  if (cat === 'Underweight') return 'Weight Gain';
  if (cat === 'Normal') return 'Maintenance';
  return 'Weight Loss'; // Overweight / Obese
}

export function healthyTargetWeight(heightCm, cat) {
  if (!heightCm) return null;
  const hm = heightCm / 100;
  if (cat === 'Underweight') return parseFloat((18.5 * hm * hm).toFixed(1));
  if (cat === 'Normal') return null; // already healthy
  return parseFloat((24.9 * hm * hm).toFixed(1));
}

/**
 * Mifflin‑St Jeor TDEE + goal adjustment.
 * Returns kcal/day.
 */
export function calcDailyCalories(weightKg, heightCm, age, gender, activityLevel, goal) {
  if (!weightKg || !heightCm || !age) return null;

  let bmr;
  if (gender === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }

  const multiplier = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    'very-active': 1.9,
  };

  const tdee = bmr * (multiplier[activityLevel] || 1.2);

  if (goal === 'Weight Loss') return Math.round(tdee - 500);
  if (goal === 'Weight Gain') return Math.round(tdee + 400);
  return Math.round(tdee); // Maintenance
}

/**
 * Derives every computed value from a raw healthProfile object.
 */
export function deriveProfileComputed(hp) {
  if (!hp) return null;
  const w = parseFloat(hp.weight);
  const h = parseFloat(hp.height);
  const a = parseInt(hp.age, 10);
  const g = hp.gender || 'male';
  const act = hp.activityLevel || 'sedentary';

  const bmi = calcBMI(w, h);
  const cat = bmiCategory(bmi);
  const goal = autoGoal(cat);
  const tw = healthyTargetWeight(h, cat);
  const cal = calcDailyCalories(w, h, a, g, act, goal);

  // Flatten conditions from the profile
  const conditions = [hp.diabetes, hp.heartConditions, hp.bloodPressure]
    .filter((v) => v && v !== 'None' && v !== 'Normal')
    .join(', ');

  return { w, h, a, g, act, bmi, cat, goal, tw, cal, conditions, allergies: hp.allergies || '' };
}

// ── Meal Slot Definitions ────────────────────────────────────────────────────

export const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast (Nashta)', emoji: '🍳', urdu: 'ناشتہ' },
  { key: 'lunch', label: 'Lunch (Dopehar)', emoji: '🍱', urdu: 'دوپہر کا کھانا' },
  { key: 'snack', label: 'Snack (Chai Time)', emoji: '🍵', urdu: 'چائے' },
  { key: 'dinner', label: 'Dinner (Raat)', emoji: '🍽️', urdu: 'رات کا کھانا' },
];

// ── Calorie Distribution per Meal ────────────────────────────────────────────

export const CALORIE_SPLIT = {
  breakfast: 0.25,
  lunch: 0.35,
  snack: 0.12,
  dinner: 0.28,
};

/**
 * Distributes total daily calories across the four meal slots.
 */
export function distributeMealCalories(totalCalories) {
  return {
    breakfast: Math.round(totalCalories * CALORIE_SPLIT.breakfast),
    lunch: Math.round(totalCalories * CALORIE_SPLIT.lunch),
    snack: Math.round(totalCalories * CALORIE_SPLIT.snack),
    dinner: Math.round(totalCalories * CALORIE_SPLIT.dinner),
  };
}

// ── Pakistani Food Bank ──────────────────────────────────────────────────────

export const PAKISTANI_FOODS = {
  proteins: [
    'Chicken (Murgh)', 'Beef (Gosht)', 'Mutton', 'Fish (Machli)',
    'Eggs (Anda)', 'Lentils (Daal)', 'Chickpeas (Chana)',
    'Kidney Beans (Rajma)', 'Yogurt (Dahi)', 'Paneer',
  ],
  carbs: [
    'Roti (Chapati)', 'Brown Rice (Chawal)', 'Paratha',
    'Naan', 'Oats (Daliya)', 'Sweet Potato (Shakarkandi)',
    'Whole-wheat bread',
  ],
  vegetables: [
    'Spinach (Palak)', 'Okra (Bhindi)', 'Potato (Aloo)',
    'Cauliflower (Gobi)', 'Tomato (Tamatar)', 'Onion (Piyaz)',
    'Bitter Gourd (Karela)', 'Bottle Gourd (Lauki/Kaddu)',
    'Peas (Matar)', 'Cabbage (Bandh Gobi)',
  ],
  fruits: [
    'Banana (Kela)', 'Apple (Seb)', 'Mango (Aam)',
    'Guava (Amrood)', 'Pomegranate (Anar)', 'Papaya',
    'Dates (Khajoor)', 'Orange (Santra)',
  ],
  fats: [
    'Olive Oil', 'Desi Ghee (small amount)', 'Almonds (Badam)',
    'Walnuts (Akhrot)', 'Peanuts (Moong Phali)', 'Flaxseeds',
  ],
};

// ── Non-Halal Violations ─────────────────────────────────────────────────────

export const HALAL_VIOLATIONS = [
  'pork', 'ham', 'bacon', 'lard', 'gelatin (non-halal)',
  'wine', 'beer', 'alcohol', 'rum', 'vodka', 'whiskey',
  'prosciutto', 'pepperoni (pork)',
];

// ── Common Allergy Groups ────────────────────────────────────────────────────

export const COMMON_ALLERGENS = [
  'Peanuts', 'Tree Nuts', 'Milk / Dairy', 'Eggs',
  'Wheat / Gluten', 'Soy', 'Fish', 'Shellfish', 'Sesame',
];

// ── Health Condition ↔ Dietary Adaptation Map ────────────────────────────────

export const CONDITION_ADAPTATIONS = {
  diabetes: {
    label: 'Diabetes',
    rules: [
      'Low-GI carbohydrates only',
      'Avoid sugar, white rice, maida (refined flour)',
      'Include bitter gourd (karela), methi (fenugreek)',
      'Smaller, frequent meals',
    ],
    avoid: ['sugar', 'white rice', 'maida', 'mithai', 'cold drinks', 'juices'],
  },
  'high blood pressure': {
    label: 'High Blood Pressure',
    rules: [
      'Low-sodium meals (< 1500 mg/day)',
      'Increase potassium: banana, potato, spinach',
      'Avoid pickles (achaar), papad, namkeen',
    ],
    avoid: ['achaar', 'namkeen', 'papad', 'excessive salt', 'processed foods'],
  },
  cholesterol: {
    label: 'High Cholesterol',
    rules: [
      'Replace saturated fats with olive oil',
      'Limit red meat to 1–2x/week',
      'Include oats, daal, fish',
      'Avoid fried foods (pakora, samosa)',
    ],
    avoid: ['fried snacks', 'ghee excess', 'red meat daily', 'full-fat dairy'],
  },
  kidney: {
    label: 'Kidney Issues',
    rules: [
      'Limit protein to ~0.8 g/kg body weight',
      'Low potassium: avoid banana, orange, potato excess',
      'Low phosphorus: limit dairy, cola',
    ],
    avoid: ['excess protein', 'banana', 'orange juice', 'cola'],
  },
  digestive: {
    label: 'Digestive Issues',
    rules: [
      'High-fibre but gentle foods',
      'Avoid spicy & deep-fried items',
      'Include yogurt (dahi) for probiotics',
    ],
    avoid: ['very spicy foods', 'deep-fried items', 'heavy cream'],
  },
};

// ── Goal Definitions ─────────────────────────────────────────────────────────

export const GOAL_OPTIONS = [
  { value: 'Weight Loss', label: 'Weight Loss', icon: '📉', description: 'Reduce body weight safely' },
  { value: 'Weight Gain', label: 'Weight Gain', icon: '📈', description: 'Increase weight with healthy foods' },
  { value: 'Maintenance', label: 'Maintenance', icon: '⚖️', description: 'Maintain current healthy weight' },
  { value: 'Muscle Building', label: 'Muscle Building', icon: '💪', description: 'High protein for muscle growth' },
  { value: 'Diabetes Management', label: 'Diabetes Management', icon: '🩺', description: 'Blood sugar control diet' },
  { value: 'Heart Health', label: 'Heart Health', icon: '❤️', description: 'Low sodium, heart-friendly' },
];

// ── Duration Options ─────────────────────────────────────────────────────────

export const DURATION_OPTIONS = [
  { value: 1, label: '1 Day', description: 'Quick trial plan' },
  { value: 7, label: '7 Days', description: 'One week plan' },
  { value: 15, label: '15 Days', description: 'Two week plan' },
  { value: 30, label: '30 Days', description: 'Full month plan' },
];

/**
 * Auto-select duration based on goal and BMI difference.
 */
export function autoDuration(goal, bmi) {
  if (goal === 'Maintenance') return 7;
  if (!bmi) return 7;
  const diff = Math.abs(bmi - 22); // distance from ideal
  if (diff < 3) return 7;
  if (diff < 7) return 15;
  return 30;
}
