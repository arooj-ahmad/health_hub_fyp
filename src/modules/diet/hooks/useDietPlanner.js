/**
 * useDietPlanner — State-machine hook for the diet planning pipeline
 *
 * States:
 *   LOADING → GOAL_SELECTION → DURATION → HEALTH_CHECK → GENERATING → PLAN_READY → ERROR
 *
 * Auto-loads user profile on mount, derives computed BMI/calorie values,
 * runs risk analysis, calls AI generation, then saves to Firestore.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/services/firestoreService';
import { toast } from 'sonner';

import { deriveProfileComputed, autoGoal, autoDuration } from '../utils/mealHelpers';
import { calcDailyMacros } from '../utils/portionCalculator';
import { generateRiskReport } from '../services/healthRiskService';
import { generateDietPlan, saveDietPlan, getUserDietPlans } from '../services/dietAIService';
import { saveDietPlanHistory } from '@/services/storage/dietPlanStorageService';

// ── Pipeline states ──────────────────────────────────────────────────────────

export const DIET_STATES = {
  LOADING: 'LOADING',
  GOAL_SELECTION: 'GOAL_SELECTION',
  DURATION: 'DURATION',
  HEALTH_CHECK: 'HEALTH_CHECK',
  GENERATING: 'GENERATING',
  PLAN_READY: 'PLAN_READY',
  ERROR: 'ERROR',
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDietPlanner() {
  const { user } = useAuth();

  // Profile state
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Pipeline
  const [stage, setStage] = useState(DIET_STATES.LOADING);
  const [selectedGoal, setSelectedGoal] = useState(null); // null = auto
  const [goalMode, setGoalMode] = useState('auto'); // 'auto' | 'manual'
  const [durationDays, setDurationDays] = useState(null);
  const [durationMode, setDurationMode] = useState('auto');

  // Risk analysis
  const [riskReport, setRiskReport] = useState(null);
  const [userOverrode, setUserOverrode] = useState(false);

  // Generated plan
  const [planResult, setPlanResult] = useState(null);
  const [savedPlanId, setSavedPlanId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Previous plans
  const [existingPlans, setExistingPlans] = useState([]);

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      setStage(DIET_STATES.ERROR);
      setErrorMessage('Please log in to use the diet planner.');
      return;
    }
    (async () => {
      try {
        const p = await getUserProfile(user.uid);
        if (!p?.healthProfile) {
          setStage(DIET_STATES.ERROR);
          setErrorMessage('Please complete your Health Profile first (Profile → Edit).');
          setProfileLoading(false);
          return;
        }
        setProfileData(p.healthProfile);

        // Also load existing plans
        try {
          const plans = await getUserDietPlans(user.uid, 'active');
          setExistingPlans(plans);
        } catch (_) { /* ignore */ }

        setStage(DIET_STATES.GOAL_SELECTION);
      } catch (e) {
        console.error('Failed to load profile:', e);
        setStage(DIET_STATES.ERROR);
        setErrorMessage('Could not load your profile. Please try again.');
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [user]);

  // ── Computed profile values ───────────────────────────────────────────────
  const computed = useMemo(() => deriveProfileComputed(profileData), [profileData]);
  const dailyMacros = useMemo(
    () => computed ? calcDailyMacros(computed.cal, selectedGoal || computed?.goal) : null,
    [computed, selectedGoal],
  );

  // Effective values
  const effectiveGoal = selectedGoal || computed?.goal || '';
  const effectiveDuration = durationDays || (computed ? autoDuration(effectiveGoal, computed.bmi) : 7);

  // ── STEP 1: Confirm Goal ──────────────────────────────────────────────────

  const confirmGoal = useCallback((goal, mode = 'auto') => {
    setSelectedGoal(mode === 'auto' ? null : goal);
    setGoalMode(mode);
    setStage(DIET_STATES.DURATION);
  }, []);

  // ── STEP 2: Confirm Duration ──────────────────────────────────────────────

  const confirmDuration = useCallback((days, mode = 'auto') => {
    setDurationDays(mode === 'auto' ? null : days);
    setDurationMode(mode);

    // Run risk analysis before generating
    if (!computed) return;

    const goal = selectedGoal || computed.goal;
    const report = generateRiskReport({
      manualGoal: goal,
      bmi: computed.bmi,
      conditions: computed.conditions,
      allergies: computed.allergies,
    });

    setRiskReport(report);

    if (!report.safe && report.severity !== 'none') {
      setStage(DIET_STATES.HEALTH_CHECK);
    } else {
      // No warnings → go straight to generation
      runGeneration(goal, mode === 'auto' ? null : days, report);
    }
  }, [computed, selectedGoal]);

  // ── STEP 3: Override risk warning ─────────────────────────────────────────

  const overrideRisk = useCallback(() => {
    setUserOverrode(true);
    const goal = selectedGoal || computed?.goal;
    runGeneration(goal, durationDays, riskReport);
  }, [selectedGoal, computed, durationDays, riskReport]);

  const cancelRisk = useCallback(() => {
    // Go back to goal selection with auto
    setSelectedGoal(null);
    setGoalMode('auto');
    setStage(DIET_STATES.GOAL_SELECTION);
  }, []);

  // ── STEP 4: AI Generation ─────────────────────────────────────────────────

  const runGeneration = useCallback(async (goal, days, report) => {
    if (!computed || !user) return;

    setStage(DIET_STATES.GENERATING);
    const finalGoal = goal || computed.goal;
    const finalDays = days || autoDuration(finalGoal, computed.bmi);

    try {
      const result = await generateDietPlan({
        profile: profileData,
        computed,
        selectedGoal: goalMode === 'manual' ? finalGoal : null,
        durationDays: finalDays,
        conditions: computed.conditions,
        allergies: computed.allergies,
        conditionAdaptations: report?.conditionAdaptations || [],
        exclusionList: report?.exclusionList || [],
      });

      // Check if plan was generated successfully
      if (!result?.dailyPlans || result.dailyPlans.length === 0) {
        setErrorMessage(result?.explanation || 'AI service temporarily unavailable. Please try again later.');
        setStage(DIET_STATES.ERROR);
        toast.error('Failed to generate diet plan. AI service temporarily unavailable.');
        return;
      }

      setPlanResult(result);

      // Save to Firestore
      const docRef = await saveDietPlan(user.uid, {
        planResult: result,
        computed,
        selectedGoal: goalMode === 'manual' ? finalGoal : null,
        durationDays: finalDays,
        conditions: computed.conditions,
        allergies: computed.allergies,
        profile: profileData,
      });

      setSavedPlanId(docRef.id);

      // Also persist to dietplans_history for the History page
      try {
        const warnings = report?.warnings || [];
        await saveDietPlanHistory(user.uid, {
          goalType: finalGoal,
          durationDays: finalDays,
          calorieTarget: computed.cal,
          dailyPlans: result.dailyPlans || [],
          manualGoalUsed: goalMode === 'manual',
          healthWarnings: warnings,
        });
      } catch (histErr) {
        console.warn('Failed to save diet plan history:', histErr);
      }

      setStage(DIET_STATES.PLAN_READY);
      toast.success('Diet plan generated and saved!');
    } catch (err) {
      console.warn('Diet plan generation failed:', err.message);
      setErrorMessage('Failed to generate diet plan. AI service temporarily unavailable. Please try again.');
      setStage(DIET_STATES.ERROR);
      toast.error('Failed to generate diet plan');
    }
  }, [computed, user, profileData, goalMode]);

  // ── Reset for a new plan ──────────────────────────────────────────────────

  const reset = useCallback(() => {
    setSelectedGoal(null);
    setGoalMode('auto');
    setDurationDays(null);
    setDurationMode('auto');
    setRiskReport(null);
    setUserOverrode(false);
    setPlanResult(null);
    setSavedPlanId(null);
    setErrorMessage('');
    setStage(computed ? DIET_STATES.GOAL_SELECTION : DIET_STATES.ERROR);
  }, [computed]);

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    // State
    stage,
    profileLoading,
    computed,
    dailyMacros,
    effectiveGoal,
    effectiveDuration,
    goalMode,
    durationMode,

    // Risk
    riskReport,
    userOverrode,

    // Result
    planResult,
    savedPlanId,
    errorMessage,
    existingPlans,

    // Actions
    confirmGoal,
    confirmDuration,
    overrideRisk,
    cancelRisk,
    reset,
  };
}
