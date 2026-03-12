/**
 * DietPlanViewer — Full plan display after generation
 *
 * Shows explanation, per-day cards, tips, and disclaimer.
 * Also provides actions: Create New Plan, View Saved Plan.
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles, Target, Lightbulb, AlertTriangle,
  RefreshCw, ExternalLink, Apple,
} from 'lucide-react';
import DailyPlanCard from './DailyPlanCard';

export default function DietPlanViewer({
  planResult,
  computed,
  effectiveGoal,
  effectiveDuration,
  dailyMacros,
  savedPlanId,
  onReset,
}) {
  if (!planResult) return null;

  const { dailyPlans, explanation, tips, disclaimer, rawText } = planResult;

  return (
    <div className="space-y-6">
      {/* Success header */}
      <Card className="glass-card p-6 border-2 border-green-500/30 bg-green-500/5">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="h-6 w-6 text-green-500" />
          <h2 className="text-2xl font-bold text-foreground">Your Diet Plan is Ready!</h2>
        </div>
        <p className="text-muted-foreground">
          {effectiveGoal} plan for {effectiveDuration} day{effectiveDuration > 1 ? 's' : ''} ·{' '}
          {computed?.cal} kcal/day
        </p>
      </Card>

      {/* Macro overview */}
      {dailyMacros && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="glass-card p-4 text-center border-l-4 border-l-primary">
            <Target className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Calories</p>
            <p className="text-xl font-bold text-foreground">{computed?.cal}</p>
          </Card>
          <Card className="glass-card p-4 text-center border-l-4 border-l-blue-500">
            <Apple className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Protein</p>
            <p className="text-xl font-bold text-foreground">{dailyMacros.protein}g</p>
          </Card>
          <Card className="glass-card p-4 text-center border-l-4 border-l-yellow-500">
            <Apple className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Carbs</p>
            <p className="text-xl font-bold text-foreground">{dailyMacros.carbs}g</p>
          </Card>
          <Card className="glass-card p-4 text-center border-l-4 border-l-orange-500">
            <Apple className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Fat</p>
            <p className="text-xl font-bold text-foreground">{dailyMacros.fat}g</p>
          </Card>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <Card className="glass-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">How This Plan Helps You</h3>
          </div>
          <p className="text-foreground leading-relaxed">{explanation}</p>
        </Card>
      )}

      {/* Daily plans */}
      {dailyPlans && dailyPlans.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Apple className="h-5 w-5 text-accent" />
            Your Meal Plans
          </h3>
          {dailyPlans.map((dp, idx) => (
            <DailyPlanCard key={idx} dayPlan={dp} dayIndex={idx} />
          ))}
        </div>
      ) : rawText ? (
        /* Fallback: raw AI text if JSON parsing failed */
        <Card className="glass-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Your Diet Plan</h3>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed bg-background/50 p-4 rounded-lg border border-border/30">
            {rawText}
          </pre>
        </Card>
      ) : null}

      {/* Tips */}
      {tips && tips.length > 0 && (
        <Card className="glass-card p-6 border-l-4 border-l-yellow-500">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-foreground">Pro Tips</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <span className="text-yellow-500">💡</span>
                <p className="text-sm text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="p-4 bg-muted/50 border-border/30">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {disclaimer || 'This diet plan is for informational purposes only and does not replace professional medical advice.'}
          </p>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="flex-1 medical-gradient text-white gap-2" onClick={onReset}>
          <RefreshCw className="h-4 w-4" />
          Create Another Plan
        </Button>
        {savedPlanId && (
          <Button variant="outline" className="flex-1 gap-2" asChild>
            <a href={`/diet-plans/${savedPlanId}`}>
              <ExternalLink className="h-4 w-4" />
              View Saved Plan
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
