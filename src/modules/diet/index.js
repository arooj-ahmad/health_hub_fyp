/**
 * Diet Module — barrel export
 *
 * Single entry-point for all public exports from the diet module.
 */

// Page
export { default as DietPlannerPage } from './pages/DietPlannerPage';
export { default as DietPlanDetailPage } from './pages/DietPlanDetailPage';

// Hook
export { useDietPlanner, DIET_STATES } from './hooks/useDietPlanner';

// Components
export { default as DietGoalSelector } from './components/DietGoalSelector';
export { default as DietDurationSelector } from './components/DietDurationSelector';
export { default as HealthWarningModal } from './components/HealthWarningModal';
export { default as MealCard } from './components/MealCard';
export { default as DailyPlanCard } from './components/DailyPlanCard';
export { default as DietPlanViewer } from './components/DietPlanViewer';

// Services
export { generateDietPlan, saveDietPlan } from './services/dietAIService';
export { analyzeGoalSafety, getConditionAdaptations, buildExclusionList, generateRiskReport } from './services/healthRiskService';
export { validateDayPlan, validateFullPlan, summariseDay } from './services/nutritionAnalysisService';

// Utils
export {
  calcBMI,
  bmiCategory,
  autoGoal,
  healthyTargetWeight,
  calcDailyCalories,
  deriveProfileComputed,
  MEAL_SLOTS,
  CALORIE_SPLIT,
  distributeMealCalories,
  PAKISTANI_FOODS,
  HALAL_VIOLATIONS,
  COMMON_ALLERGENS,
  CONDITION_ADAPTATIONS,
  GOAL_OPTIONS,
  DURATION_OPTIONS,
  autoDuration,
} from './utils/mealHelpers';

export { calcDailyMacros, mealMacros, PORTION_GUIDE, portionForCalories, validateCalorieTotals } from './utils/portionCalculator';
