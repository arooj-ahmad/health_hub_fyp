/**
 * DietPlannerPage — Main page shell for the diet module
 *
 * Thin wrapper that wires the useDietPlanner hook to the step components.
 * The pipeline progresses: Goal → Duration → Health Check → Generating → Plan Ready
 */

import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowLeft, AlertCircle, Apple, History } from 'lucide-react';

import { useDietPlanner, DIET_STATES } from '../hooks/useDietPlanner';
import DietGoalSelector from '../components/DietGoalSelector';
import DietDurationSelector from '../components/DietDurationSelector';
import HealthWarningModal from '../components/HealthWarningModal';
import DietPlanViewer from '../components/DietPlanViewer';
import { useNavigate } from 'react-router-dom';

const DietPlannerPage = () => {
  const navigate = useNavigate();

  const {
    stage,
    profileLoading,
    computed,
    dailyMacros,
    effectiveGoal,
    effectiveDuration,
    goalMode,
    riskReport,
    planResult,
    savedPlanId,
    errorMessage,
    existingPlans,
    confirmGoal,
    confirmDuration,
    overrideRisk,
    cancelRisk,
    reset,
  } = useDietPlanner();

  // ── Step indicator ──────────────────────────────────────────────────────
  const steps = [
    { key: DIET_STATES.GOAL_SELECTION, label: 'Goal', num: 1 },
    { key: DIET_STATES.DURATION, label: 'Duration', num: 2 },
    { key: DIET_STATES.HEALTH_CHECK, label: 'Safety Check', num: 3 },
    { key: DIET_STATES.GENERATING, label: 'Generating', num: 4 },
    { key: DIET_STATES.PLAN_READY, label: 'Plan Ready', num: 5 },
  ];

  const currentStepIdx = steps.findIndex(s => s.key === stage);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Apple className="h-8 w-8 text-primary" />
              AI Diet Planner
            </h1>
            <p className="text-muted-foreground text-lg">
              Personalized Pakistani halal diet plans powered by AI
            </p>
          </div>
          <Button variant="outline" className="gap-2 flex-shrink-0" onClick={() => navigate('/diet/history')}>
            <History className="h-4 w-4" />
            View Diet History
          </Button>
        </div>

        {/* Step progress bar */}
        {stage !== DIET_STATES.LOADING && stage !== DIET_STATES.ERROR && (
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < currentStepIdx ? 'bg-primary text-white' :
                  i === currentStepIdx ? 'bg-primary/20 text-primary border-2 border-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i < currentStepIdx ? '✓' : s.num}
                </div>
                <span className={`text-xs hidden sm:inline ${
                  i <= currentStepIdx ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 ${i < currentStepIdx ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Existing plans banner */}
        {existingPlans.length > 0 && stage === DIET_STATES.GOAL_SELECTION && (
          <Card className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground font-medium">
                You have {existingPlans.length} active diet plan{existingPlans.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">Creating a new plan won't delete existing ones</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/diet-plans/${existingPlans[0].id}`)}>
              View Latest
            </Button>
          </Card>
        )}

        {/* ── Stage Rendering ─────────────────────────────────────────── */}

        {/* LOADING */}
        {(stage === DIET_STATES.LOADING || profileLoading) && (
          <Card className="glass-card p-12 text-center">
            <LoadingSpinner />
            <p className="text-muted-foreground mt-4">Loading your health profile…</p>
          </Card>
        )}

        {/* ERROR */}
        {stage === DIET_STATES.ERROR && (
          <Card className="glass-card p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate('/profile/edit')}>
                Edit Profile
              </Button>
              <Button className="medical-gradient text-white" onClick={reset}>
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* GOAL SELECTION */}
        {stage === DIET_STATES.GOAL_SELECTION && computed && (
          <DietGoalSelector computed={computed} onConfirm={confirmGoal} />
        )}

        {/* DURATION */}
        {stage === DIET_STATES.DURATION && computed && (
          <>
            <Button variant="ghost" className="gap-2" onClick={() => reset()}>
              <ArrowLeft className="h-4 w-4" /> Change Goal
            </Button>
            <DietDurationSelector
              computed={computed}
              effectiveGoal={effectiveGoal}
              onConfirm={confirmDuration}
            />
          </>
        )}

        {/* HEALTH CHECK */}
        {stage === DIET_STATES.HEALTH_CHECK && riskReport && (
          <HealthWarningModal
            riskReport={riskReport}
            onOverride={overrideRisk}
            onCancel={cancelRisk}
          />
        )}

        {/* GENERATING */}
        {stage === DIET_STATES.GENERATING && (
          <Card className="glass-card p-12 text-center">
            <div className="flex justify-center mb-4">
              <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Generating Your Diet Plan…
            </h2>
            <p className="text-muted-foreground mb-4">
              Creating {effectiveDuration} day Pakistani halal meal plan for {effectiveGoal}
            </p>
            <LoadingSpinner />
            <p className="text-xs text-muted-foreground mt-4">
              This may take 15–30 seconds depending on plan length
            </p>
          </Card>
        )}

        {/* PLAN READY */}
        {stage === DIET_STATES.PLAN_READY && planResult && (
          <DietPlanViewer
            planResult={planResult}
            computed={computed}
            effectiveGoal={effectiveGoal}
            effectiveDuration={effectiveDuration}
            dailyMacros={dailyMacros}
            savedPlanId={savedPlanId}
            onReset={reset}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default DietPlannerPage;
