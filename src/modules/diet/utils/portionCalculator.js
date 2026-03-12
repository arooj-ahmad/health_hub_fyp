/**
 * portionCalculator.js — Portion sizing and macro distribution
 *
 * Calculates per-meal macro targets and provides Pakistani-specific
 * portion guidance (roti count, cup sizes, etc.).
 */

// ── Macro Ratios by Goal ─────────────────────────────────────────────────────

const MACRO_RATIOS = {
  'Weight Loss':        { protein: 0.35, carbs: 0.35, fat: 0.30 },
  'Weight Gain':        { protein: 0.25, carbs: 0.50, fat: 0.25 },
  'Maintenance':        { protein: 0.30, carbs: 0.40, fat: 0.30 },
  'Muscle Building':    { protein: 0.40, carbs: 0.35, fat: 0.25 },
  'Diabetes Management':{ protein: 0.30, carbs: 0.30, fat: 0.40 },
  'Heart Health':       { protein: 0.25, carbs: 0.45, fat: 0.30 },
};

/**
 * Return daily macro targets in grams.
 * Protein/carbs = 4 kcal/g, fat = 9 kcal/g.
 */
export function calcDailyMacros(totalCalories, goal) {
  const ratios = MACRO_RATIOS[goal] || MACRO_RATIOS['Maintenance'];
  return {
    protein: Math.round((totalCalories * ratios.protein) / 4),
    carbs: Math.round((totalCalories * ratios.carbs) / 4),
    fat: Math.round((totalCalories * ratios.fat) / 9),
  };
}

/**
 * Per-meal macro breakdown given daily macros and the calorie-split map.
 */
export function mealMacros(dailyMacros, calorieSplit) {
  const result = {};
  for (const [slot, fraction] of Object.entries(calorieSplit)) {
    result[slot] = {
      protein: Math.round(dailyMacros.protein * fraction),
      carbs: Math.round(dailyMacros.carbs * fraction),
      fat: Math.round(dailyMacros.fat * fraction),
    };
  }
  return result;
}

// ── Pakistani Portion Guidance ───────────────────────────────────────────────

export const PORTION_GUIDE = {
  roti: { label: 'Roti (medium, 6")', gramsPerUnit: 40, caloriesPerUnit: 110 },
  rice: { label: 'Cooked Rice', gramsPerCup: 180, caloriesPerCup: 210 },
  daal: { label: 'Daal (cooked)', gramsPerCup: 200, caloriesPerCup: 180 },
  chicken: { label: 'Chicken (boneless)', gramsPerPiece: 100, caloriesPerPiece: 165 },
  egg: { label: 'Egg (boiled)', gramsPerUnit: 50, caloriesPerUnit: 78 },
  yogurt: { label: 'Yogurt (Dahi)', gramsPerCup: 245, caloriesPerCup: 100 },
  sabzi: { label: 'Cooked Vegetables', gramsPerCup: 180, caloriesPerCup: 80 },
  fruit: { label: 'Fresh fruit (medium)', gramsPerUnit: 150, caloriesPerUnit: 80 },
  milk: { label: 'Milk (1 cup)', mlPerCup: 240, caloriesPerCup: 120 },
  bread: { label: 'Whole-wheat bread', gramsPerSlice: 30, caloriesPerSlice: 75 },
};

/**
 * Return human-readable portion string for a given food key and target calories.
 * e.g. rotis(330) → "3 rotis"
 */
export function portionForCalories(foodKey, targetCalories) {
  const food = PORTION_GUIDE[foodKey];
  if (!food) return null;

  if (food.caloriesPerUnit) {
    const count = Math.round(targetCalories / food.caloriesPerUnit);
    return `${count} × ${food.label}`;
  }
  if (food.caloriesPerCup) {
    const cups = (targetCalories / food.caloriesPerCup).toFixed(1);
    return `${cups} cup ${food.label}`;
  }
  if (food.caloriesPerPiece) {
    const count = Math.round(targetCalories / food.caloriesPerPiece);
    return `${count} piece ${food.label}`;
  }
  if (food.caloriesPerSlice) {
    const count = Math.round(targetCalories / food.caloriesPerSlice);
    return `${count} slice ${food.label}`;
  }
  return null;
}

/**
 * Validates that total meal calories add up within ±5 % of daily target.
 */
export function validateCalorieTotals(dailyPlan, dailyTarget) {
  const totalCals = dailyPlan.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const diff = Math.abs(totalCals - dailyTarget);
  const pct = (diff / dailyTarget) * 100;
  return {
    totalCalories: totalCals,
    expectedCalories: dailyTarget,
    difference: diff,
    percentOff: parseFloat(pct.toFixed(1)),
    isValid: pct <= 5,
  };
}
