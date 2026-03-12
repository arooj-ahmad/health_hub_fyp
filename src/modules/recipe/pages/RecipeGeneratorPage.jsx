/**
 * RecipeGeneratorPage
 *
 * Thin page shell that wires the useRecipeGenerator hook to the UI components.
 * All state management lives inside the hook; all presentation lives in the
 * child components under modules/recipe/components/.
 */

import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useRecipeGenerator, PIPELINE_STATES } from '../hooks/useRecipeGenerator';
import IngredientInput from '../components/IngredientInput';
import HealthAlertModal from '../components/HealthAlertModal';
import RecipeList from '../components/RecipeList';
import OverrideWarningBanner from '../components/OverrideWarningBanner';
import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';

const STATES = PIPELINE_STATES;

const RecipeGeneratorPage = () => {
  const navigate = useNavigate();
  const {
    profileData,
    profileLoading,
    computed,
    userProfile,
    pipelineState,
    normalizedIngredients,
    riskAnalysis,
    recipes,
    healthierAlternatives,
    disclaimer,
    userOverrode,
    errorMessage,
    handleSubmitIngredients,
    handleContinueAnyway,
    handleCancel,
    handleStartOver,
  } = useRecipeGenerator();

  // ── Loading state ──────────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              🍽️ Smart Recipe Recommendations
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Enter your ingredients and get healthy, halal Pakistani recipes personalized for your health profile
            </p>
          </div>
          <Button variant="outline" className="gap-2 flex-shrink-0" onClick={() => navigate('/recipes/history')}>
            <History className="h-4 w-4" />
            View Recipe History
          </Button>
        </div>

        {/* Health profile summary card */}
        {profileData && computed.bmi && (
          <Card className="glass-card p-5 border-l-4 border-l-primary">
            <div className="flex items-start gap-3 mb-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground text-sm">Your Health Profile</h3>
                <p className="text-xs text-muted-foreground">
                  BMI {computed.bmi} ({computed.cat}) · Goal: {computed.goal} · Target: {computed.cal} kcal/day
                </p>
                {computed.conditions !== 'None' && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Conditions: {computed.conditions}
                  </p>
                )}
                {computed.allergies !== 'None' && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Allergies: {computed.allergies}
                  </p>
                )}
              </div>
            </div>
            {computed.restricted?.length > 0 && (
              <div className="flex items-start gap-3 mt-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-destructive mb-1">
                    Restricted Ingredients (auto-detected from your conditions)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {computed.restricted.map((r, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-destructive/40 text-destructive">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* No profile warning */}
        {!profileData && !profileLoading && (
          <Card className="glass-card p-5 border-l-4 border-l-amber-500">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground text-sm">Health Profile Not Found</h3>
                <p className="text-xs text-muted-foreground">
                  Please complete your health profile in Profile Setup first. This is needed to personalize recipes for your conditions.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Normalized ingredients display (after analysis) */}
        {normalizedIngredients.length > 0 && pipelineState !== STATES.INPUT && (
          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">Normalized Ingredients:</span>
              <span className="text-xs text-muted-foreground">(auto-corrected from your input)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {normalizedIngredients.map((ing, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {ing}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* ── STATE: INPUT ─────────────────────────────────────────────────── */}
        {pipelineState === STATES.INPUT && (
          <IngredientInput
            onSubmit={handleSubmitIngredients}
            isLoading={false}
            disabled={!profileData}
          />
        )}

        {/* ── STATE: ANALYZING (Steps 1-3) ─────────────────────────────────── */}
        {pipelineState === STATES.ANALYZING && (
          <Card className="glass-card p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Analyzing Your Ingredients...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Normalizing input → Mapping Pakistani context → Checking health risks
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="animate-pulse">Step 1: Normalizing</Badge>
                <Badge variant="outline" className="animate-pulse">Step 2: Context</Badge>
                <Badge variant="outline" className="animate-pulse">Step 3: Health Check</Badge>
              </div>
            </div>
          </Card>
        )}

        {/* ── STATE: HEALTH_ALERT (Step 5) ─────────────────────────────────── */}
        {pipelineState === STATES.HEALTH_ALERT && riskAnalysis && (
          <HealthAlertModal
            riskAnalysis={riskAnalysis}
            onContinue={handleContinueAnyway}
            onCancel={handleCancel}
            isLoading={false}
          />
        )}

        {/* ── STATE: GENERATING (Steps 7-10) ───────────────────────────────── */}
        {pipelineState === STATES.GENERATING && (
          <Card className="glass-card p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Generating Your Recipes...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Creating 4 healthy, halal Pakistani recipes tailored to your profile
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                <Badge variant="secondary">✅ Halal Compliance</Badge>
                <Badge variant="secondary">⚖️ Nutrition Balancing</Badge>
                <Badge variant="secondary">🔄 Smart Substitution</Badge>
                <Badge variant="secondary">🇵🇰 Pakistani Context</Badge>
              </div>
            </div>
          </Card>
        )}

        {/* ── STATE: RECIPES_READY ─────────────────────────────────────────── */}
        {pipelineState === STATES.RECIPES_READY && (
          <>
            {/* Override warning banner (Step 6) */}
            {userOverrode && riskAnalysis?.problemIngredients && (
              <OverrideWarningBanner problemIngredients={riskAnalysis.problemIngredients} />
            )}

            {/* Recipe list */}
            <RecipeList
              recipes={recipes}
              healthierAlternatives={healthierAlternatives}
              disclaimer={disclaimer}
              userProfile={userProfile}
            />

            {/* Start over button */}
            <div className="flex justify-center gap-3 pt-4">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleStartOver}
              >
                <RefreshCw className="h-4 w-4" />
                Generate New Recipes
              </Button>
            </div>
          </>
        )}

        {/* ── STATE: ERROR ─────────────────────────────────────────────────── */}
        {pipelineState === STATES.ERROR && (
          <Card className="glass-card p-6 border-l-4 border-l-destructive">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive text-sm">Something went wrong</h3>
                <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
                <Button variant="outline" className="mt-3 gap-2" onClick={handleStartOver}>
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RecipeGeneratorPage;
