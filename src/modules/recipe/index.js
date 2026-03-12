/**
 * Recipe Module — barrel export
 *
 * Single entry-point for all public exports from the recipe module.
 */

// Page
export { default as RecipeGeneratorPage } from './pages/RecipeGeneratorPage';

// Hook
export { useRecipeGenerator, PIPELINE_STATES } from './hooks/useRecipeGenerator';

// Components
export { default as IngredientInput } from './components/IngredientInput';
export { default as HealthAlertModal } from './components/HealthAlertModal';
export { default as RecipeCard } from './components/RecipeCard';
export { default as RecipeList } from './components/RecipeList';
export { default as OverrideWarningBanner } from './components/OverrideWarningBanner';

// Services
export { normalizeIngredients, mapPakistaniContext } from './services/ingredientNormalization';
export { analyzeHealthRisks } from './services/nutritionAnalysisService';
export { generateHealthyRecipes } from './services/recipeAIService';

// Utils
export {
  PAKISTANI_CONTEXT_MAP,
  HALAL_VIOLATIONS,
  buildRestrictions,
  calcBMI,
  bmiCategory,
  autoGoal,
  calcCalories,
  deriveProfileComputed,
} from './utils/ingredientHelpers';
