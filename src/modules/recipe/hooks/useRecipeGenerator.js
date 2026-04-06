/**
 * useRecipeGenerator — Custom hook that owns the whole recipe-pipeline state machine.
 *
 * States: INPUT → ANALYZING → HEALTH_ALERT → GENERATING → RECIPES_READY → ERROR
 *
 * Exposes all the state variables and action handlers the page-level component needs,
 * plus a `computed` object derived from the user's health profile.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/services/firestoreService';
import { toast } from 'sonner';

import { normalizeIngredients, mapPakistaniContext } from '../services/ingredientNormalization';
import { analyzeHealthRisks } from '../services/nutritionAnalysisService';
import { generateHealthyRecipes } from '../services/recipeAIService';
import { deriveProfileComputed } from '../utils/ingredientHelpers';
import { attachRecipeImages } from '@/utils/recipeImageGenerator';
import { saveRecipeHistory } from '@/services/storage/recipeStorageService';

// ── Pipeline states ──────────────────────────────────────────────────────────

export const PIPELINE_STATES = {
  INPUT: 'INPUT',
  ANALYZING: 'ANALYZING',
  HEALTH_ALERT: 'HEALTH_ALERT',
  GENERATING: 'GENERATING',
  RECIPES_READY: 'RECIPES_READY',
  ERROR: 'ERROR',
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useRecipeGenerator() {
  const { user } = useAuth();

  // Profile
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Pipeline state
  const [pipelineState, setPipelineState] = useState(PIPELINE_STATES.INPUT);
  const [rawInput, setRawInput] = useState('');
  const [normalizedIngredientsList, setNormalizedIngredientsList] = useState([]);
  const [pakistaniMapped, setPakistaniMapped] = useState([]);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [healthierAlternatives, setHealthierAlternatives] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [userOverrode, setUserOverrode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ── Load user health profile ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    (async () => {
      try {
        const p = await getUserProfile(user.uid);
        setProfileData(p?.healthProfile || null);
      } catch (e) {
        console.warn('Could not load profile:', e);
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [user]);

  // ── Computed profile values ───────────────────────────────────────────────
  const computed = useMemo(() => deriveProfileComputed(profileData) || {}, [profileData]);

  // Build the userProfile object the service layer expects
  const userProfile = useMemo(() => {
    if (!profileData || !computed.bmi) return null;
    return {
      age: computed.a,
      gender: computed.g,
      height: computed.h,
      weight: computed.w,
      bmi: computed.bmi,
      bmiCategory: computed.cat,
      conditions: computed.conditions,
      allergies: computed.allergies,
      goal: computed.goal,
      calories: computed.cal,
    };
  }, [profileData, computed]);

  // ── Firestore save helper ─────────────────────────────────────────────────
  const saveToFirestore = useCallback(
    async (recipeData, alternatives, risk, overrode, input, normalized) => {
      if (!user) return;
      try {
        const warnings = (risk?.problemIngredients || []).map(p => p.reason);
        const docId = await saveRecipeHistory(user.uid, {
          ingredientsInput: Array.isArray(input) ? input : input.split(',').map(s => s.trim()),
          normalizedIngredients: normalized,
          generatedRecipes: recipeData,
          healthWarnings: warnings,
          overrideUsed: overrode,
        });
        if (docId) {
          console.log('[useRecipeGenerator] Recipe history saved:', docId);
        }
      } catch (err) {
        console.error('[useRecipeGenerator] Failed to save recipe history:', err);
        toast.warning('Recipes generated but could not be saved to history. You may need to deploy Firestore rules.');
      }
    },
    [user],
  );

  // ── STEP 1-5: Run the pipeline ───────────────────────────────────────────
  const handleSubmitIngredients = useCallback(
    async (ingredientText) => {
      if (!userProfile) {
        toast.error('Please complete your health profile first (Profile Setup)');
        return;
      }

      setRawInput(ingredientText);
      setPipelineState(PIPELINE_STATES.ANALYZING);
      setRecipes([]);
      setHealthierAlternatives([]);
      setDisclaimer('');
      setUserOverrode(false);
      setErrorMessage('');

      try {
        // Step 1: Normalize
        const { normalized } = await normalizeIngredients(ingredientText);

        // Step 2: Pakistani context
        const mapped = mapPakistaniContext(normalized);

        // Step 3: Health-risk analysis
        const risk = await analyzeHealthRisks(normalized, userProfile, computed.restricted || []);

        setNormalizedIngredientsList(normalized);
        setPakistaniMapped(mapped);
        setRiskAnalysis(risk);

        if (risk.problemIngredients.length > 0) {
          // Step 5 — show health alert
          setPipelineState(PIPELINE_STATES.HEALTH_ALERT);
        } else {
          // No issues → generate recipes
          const result = await generateHealthyRecipes(mapped, userProfile, risk, false);

          // Check if recipes were generated
          if (!result.recipes || result.recipes.length === 0) {
            setErrorMessage(result.disclaimer || 'AI service temporarily unavailable. Please try again.');
            setPipelineState(PIPELINE_STATES.ERROR);
            return;
          }

          // Attach AI-generated food images to each recipe
          const recipesWithImages = await attachRecipeImages(result.recipes || []);

          // Save to Firebase FIRST (before state transition — matches diet plan pattern)
          await saveToFirestore(recipesWithImages, result.healthierAlternatives, risk, false, ingredientText, normalized);

          setRecipes(recipesWithImages);
          setHealthierAlternatives(result.healthierAlternatives || []);
          setDisclaimer(result.disclaimer || '');
          setPipelineState(PIPELINE_STATES.RECIPES_READY);
          toast.success(`${recipesWithImages.length} healthy recipes generated!`);
        }
      } catch (err) {
        console.warn('Pipeline error:', err.message);
        setErrorMessage('Something went wrong. Please try again.');
        setPipelineState(PIPELINE_STATES.ERROR);
      }
    },
    [userProfile, computed.restricted, saveToFirestore],
  );

  // ── STEP 6: Continue Anyway (user override) ──────────────────────────────
  const handleContinueAnyway = useCallback(async () => {
    setPipelineState(PIPELINE_STATES.GENERATING);
    setUserOverrode(true);

    try {
      const result = await generateHealthyRecipes(pakistaniMapped, userProfile, riskAnalysis, true);

      // Check if recipes were generated
      if (!result.recipes || result.recipes.length === 0) {
        setErrorMessage(result.disclaimer || 'AI service temporarily unavailable. Please try again.');
        setPipelineState(PIPELINE_STATES.ERROR);
        return;
      }

      // Attach AI-generated food images to each recipe
      const recipesWithImages = await attachRecipeImages(result.recipes || []);

      // Save to Firebase FIRST (before state transition — matches diet plan pattern)
      await saveToFirestore(recipesWithImages, result.healthierAlternatives, riskAnalysis, true, rawInput, normalizedIngredientsList);

      setRecipes(recipesWithImages);
      setHealthierAlternatives(result.healthierAlternatives || []);
      setDisclaimer(result.disclaimer || '');
      setPipelineState(PIPELINE_STATES.RECIPES_READY);
      toast.success(`${recipesWithImages.length} recipes generated (with health override)`);
    } catch (err) {
      console.warn('Override generation error:', err.message);
      setErrorMessage('Failed to generate recipes. AI service temporarily unavailable.');
      setPipelineState(PIPELINE_STATES.ERROR);
    }
  }, [pakistaniMapped, userProfile, riskAnalysis, rawInput, normalizedIngredientsList, saveToFirestore]);

  // ── Cancel / Start Over ───────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    setPipelineState(PIPELINE_STATES.INPUT);
    setRawInput('');
    setNormalizedIngredientsList([]);
    setPakistaniMapped([]);
    setRiskAnalysis(null);
    setRecipes([]);
    setHealthierAlternatives([]);
    setDisclaimer('');
    setUserOverrode(false);
    setErrorMessage('');
    toast.info('Please enter new ingredients so I can suggest safer recipes.');
  }, []);

  return {
    // Profile
    profileData,
    profileLoading,
    computed,
    userProfile,

    // Pipeline state
    pipelineState,
    normalizedIngredients: normalizedIngredientsList,
    riskAnalysis,
    recipes,
    healthierAlternatives,
    disclaimer,
    userOverrode,
    errorMessage,

    // Actions
    handleSubmitIngredients,
    handleContinueAnyway,
    handleCancel,
    handleStartOver: handleCancel,
  };
}
