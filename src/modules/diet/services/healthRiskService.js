/**
 * healthRiskService.js — Manual goal safety analysis + condition-based adaptations
 *
 * Runs BEFORE the AI generation step to:
 *  1. Detect if the manually-chosen goal contradicts the auto-computed goal.
 *  2. Collect all condition-based dietary adaptations.
 *  3. Build a warnings array for HealthWarningModal.
 */

import {
  CONDITION_ADAPTATIONS,
  HALAL_VIOLATIONS,
  autoGoal,
  bmiCategory,
} from '../utils/mealHelpers';

// ── Goal Safety Analysis ─────────────────────────────────────────────────────

/**
 * Compare the user's manual goal against the BMI-derived automatic goal.
 * Returns { safe: boolean, warnings: string[], adaptations: object[] }
 */
export function analyzeGoalSafety(manualGoal, bmi) {
  const cat = bmiCategory(bmi);
  const recommended = autoGoal(cat);
  const warnings = [];

  // If goal matches recommendation → safe
  if (manualGoal === recommended) {
    return { safe: true, warnings: [], severity: 'none' };
  }

  // Dangerous combinations
  if (manualGoal === 'Weight Loss' && cat === 'Underweight') {
    warnings.push(
      `Your BMI (${bmi}) is in the Underweight range. Weight Loss is medically risky — you should be gaining weight, not losing it.`
    );
    return { safe: false, warnings, severity: 'critical' };
  }

  if (manualGoal === 'Weight Gain' && cat === 'Obese') {
    warnings.push(
      `Your BMI (${bmi}) is in the Obese range. Weight Gain could worsen health risks. The recommended goal is Weight Loss.`
    );
    return { safe: false, warnings, severity: 'critical' };
  }

  // Moderate mismatch
  if (manualGoal === 'Weight Gain' && cat === 'Overweight') {
    warnings.push(
      `Your BMI (${bmi}) is Overweight. The system recommends Weight Loss instead of Weight Gain.`
    );
    return { safe: false, warnings, severity: 'warning' };
  }

  if (manualGoal === 'Weight Loss' && cat === 'Normal') {
    warnings.push(
      `Your BMI (${bmi}) is Normal. Weight Loss is not necessary — Maintenance is recommended.`
    );
    return { safe: false, warnings, severity: 'warning' };
  }

  if (manualGoal === 'Muscle Building' && cat === 'Obese') {
    warnings.push(
      `Your BMI (${bmi}) is in the Obese range. Focus on Weight Loss first before Muscle Building.`
    );
    return { safe: false, warnings, severity: 'warning' };
  }

  // Soft info for anything else
  if (manualGoal !== recommended) {
    warnings.push(
      `Based on your BMI (${bmi}), the system recommends "${recommended}" but you selected "${manualGoal}".`
    );
    return { safe: false, warnings, severity: 'info' };
  }

  return { safe: true, warnings: [], severity: 'none' };
}

// ── Condition-Based Dietary Adaptations ──────────────────────────────────────

/**
 * Parse the user's conditions string (comma-separated) and return
 * the matching adaptation rules and avoidance lists.
 */
export function getConditionAdaptations(conditionsStr) {
  if (!conditionsStr) return { adaptations: [], avoidFoods: [] };

  const lower = conditionsStr.toLowerCase();
  const matched = [];
  const avoidSet = new Set();

  for (const [key, adaptation] of Object.entries(CONDITION_ADAPTATIONS)) {
    if (lower.includes(key)) {
      matched.push(adaptation);
      adaptation.avoid.forEach((f) => avoidSet.add(f));
    }
  }

  return {
    adaptations: matched,
    avoidFoods: [...avoidSet],
  };
}

// ── Allergy Exclusion ────────────────────────────────────────────────────────

/**
 * Build the list of foods / ingredients to completely exclude.
 */
export function buildExclusionList(allergiesStr, conditionsStr) {
  const exclusions = new Set();

  // Halal violations always excluded
  HALAL_VIOLATIONS.forEach((v) => exclusions.add(v));

  // Allergies
  if (allergiesStr) {
    allergiesStr
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean)
      .forEach((a) => exclusions.add(a));
  }

  // Condition-based avoidance
  const { avoidFoods } = getConditionAdaptations(conditionsStr);
  avoidFoods.forEach((f) => exclusions.add(f));

  return [...exclusions];
}

// ── Combined Risk Report ─────────────────────────────────────────────────────

/**
 * Full risk report combining goal safety + condition adaptations + exclusions.
 */
export function generateRiskReport({ manualGoal, bmi, conditions, allergies }) {
  const goalSafety = analyzeGoalSafety(manualGoal, bmi);
  const condAdapt = getConditionAdaptations(conditions);
  const exclusions = buildExclusionList(allergies, conditions);

  return {
    ...goalSafety,
    conditionAdaptations: condAdapt.adaptations,
    exclusionList: exclusions,
  };
}
