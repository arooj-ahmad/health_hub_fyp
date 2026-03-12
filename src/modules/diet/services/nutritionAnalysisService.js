/**
 * nutritionAnalysisService.js — Macro balancing & calorie validation
 *
 * Validates AI-generated plans for macro targets, calorie accuracy,
 * and structural completeness before they're shown to the user.
 */

import { calcDailyMacros } from '../utils/portionCalculator';
import { CALORIE_SPLIT, MEAL_SLOTS } from '../utils/mealHelpers';

// ── Validate a Single Day Plan ───────────────────────────────────────────────

/**
 * Checks one day's meals against expected calorie & macro targets.
 *
 * @param {{ meals: Array }} dayPlan
 * @param {number} dailyCalories
 * @param {string} goal
 * @returns {{ valid: boolean, issues: string[], totalCalories: number, macros: object }}
 */
export function validateDayPlan(dayPlan, dailyCalories, goal) {
  const issues = [];
  const dailyMacroTargets = calcDailyMacros(dailyCalories, goal);

  // Sum up all meal calories & macros
  let totalCal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  if (!dayPlan?.meals || dayPlan.meals.length === 0) {
    return {
      valid: false,
      issues: ['Day plan has no meals'],
      totalCalories: 0,
      macros: { protein: 0, carbs: 0, fat: 0 },
    };
  }

  for (const meal of dayPlan.meals) {
    totalCal += meal.calories || 0;
    totalProtein += meal.protein || 0;
    totalCarbs += meal.carbs || 0;
    totalFat += meal.fat || 0;
  }

  // Calorie tolerance: within ±8 %
  const calDiff = Math.abs(totalCal - dailyCalories);
  const calPct = (calDiff / dailyCalories) * 100;
  if (calPct > 8) {
    issues.push(
      `Total calories (${totalCal}) differ from target (${dailyCalories}) by ${calPct.toFixed(1)}%`
    );
  }

  // Check all 4 meal slots present
  const presentSlots = new Set(dayPlan.meals.map((m) => m.slot));
  for (const slot of MEAL_SLOTS) {
    if (!presentSlots.has(slot.key)) {
      issues.push(`Missing meal slot: ${slot.label}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    totalCalories: totalCal,
    macros: { protein: totalProtein, carbs: totalCarbs, fat: totalFat },
    macroTargets: dailyMacroTargets,
  };
}

// ── Validate Full Plan ───────────────────────────────────────────────────────

/**
 * Validates every day in the plan.
 *
 * @param {Array<{ day: number, meals: Array }>} dailyPlans
 * @param {number} dailyCalories
 * @param {string} goal
 * @param {number} expectedDays
 * @returns {{ valid: boolean, dayResults: Array, overallIssues: string[] }}
 */
export function validateFullPlan(dailyPlans, dailyCalories, goal, expectedDays) {
  const overallIssues = [];

  if (!dailyPlans || dailyPlans.length === 0) {
    return { valid: false, dayResults: [], overallIssues: ['Plan has no daily plans'] };
  }

  if (dailyPlans.length !== expectedDays) {
    overallIssues.push(
      `Expected ${expectedDays} days but got ${dailyPlans.length}`
    );
  }

  const dayResults = dailyPlans.map((dp) => validateDayPlan(dp, dailyCalories, goal));
  const allValid = dayResults.every((r) => r.valid) && overallIssues.length === 0;

  return { valid: allValid, dayResults, overallIssues };
}

// ── Summarise a Day Plan ─────────────────────────────────────────────────────

/**
 * Returns a compact summary for display cards.
 */
export function summariseDay(dayPlan) {
  if (!dayPlan?.meals) return { totalCalories: 0, protein: 0, carbs: 0, fat: 0 };

  return dayPlan.meals.reduce(
    (acc, m) => ({
      totalCalories: acc.totalCalories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0),
    }),
    { totalCalories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
