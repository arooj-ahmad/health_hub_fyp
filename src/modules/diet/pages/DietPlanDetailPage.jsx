/**
 * DietPlanDetailPage — View a saved diet plan by its Firestore document ID.
 *
 * Route: /diet-plans/:id
 *
 * Fetches from the `dietPlans` collection using getDocument(), then renders
 * the plan using existing DailyPlanCard components.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Apple, ArrowLeft, AlertCircle, Target, Sparkles,
  Lightbulb, AlertTriangle, RefreshCw, Calendar,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getDocument } from '@/services/firestoreService';
import DailyPlanCard from '../components/DailyPlanCard';

const DietPlanDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch plan on mount or when id changes ──────────────────────────────
  useEffect(() => {
    if (!id) {
      setError('No diet plan ID provided.');
      setLoading(false);
      return;
    }

    if (!user) {
      setError('Please log in to view this diet plan.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const doc = await getDocument('dietPlans', id);

        if (cancelled) return;

        if (!doc) {
          setError('Diet plan not found. It may have been deleted.');
          setLoading(false);
          return;
        }

        // Security check: only show plans belonging to current user
        if (doc.userId && doc.userId !== user.uid) {
          setError('You do not have permission to view this diet plan.');
          setLoading(false);
          return;
        }

        setPlan(doc);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch diet plan:', err);
          setError('Failed to load diet plan. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id, user]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back button */}
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/diet-plans')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Diet Planner
        </Button>

        {/* Loading */}
        {loading && (
          <Card className="glass-card p-12 text-center">
            <LoadingSpinner />
            <p className="text-muted-foreground mt-4">Loading diet plan…</p>
          </Card>
        )}

        {/* Error */}
        {!loading && error && (
          <Card className="glass-card p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate('/diet-plans')}>
                Go to Diet Planner
              </Button>
              <Button className="medical-gradient text-white" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Plan data */}
        {!loading && !error && plan && (
          <div className="space-y-6">
            {/* Header card */}
            <Card className="glass-card p-6 border-2 border-primary/30 bg-primary/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Apple className="h-7 w-7 text-primary" />
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      {plan.name || plan.goal || 'Diet Plan'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {formatDate(plan.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={plan.status === 'active' ? 'default' : 'secondary'}
                  className={plan.status === 'active' ? 'bg-green-500/20 text-green-600' : ''}
                >
                  {plan.status || 'active'}
                </Badge>
              </div>
            </Card>

            {/* Stats overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="glass-card p-4 text-center border-l-4 border-l-primary">
                <Target className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Target Calories</p>
                <p className="text-xl font-bold text-foreground">{plan.targetCalories || '—'}</p>
              </Card>
              <Card className="glass-card p-4 text-center border-l-4 border-l-blue-500">
                <Apple className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Goal</p>
                <p className="text-lg font-bold text-foreground">{plan.goal || '—'}</p>
              </Card>
              <Card className="glass-card p-4 text-center border-l-4 border-l-yellow-500">
                <Calendar className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-lg font-bold text-foreground">{plan.duration || `${plan.durationDays || 0} days`}</p>
              </Card>
              <Card className="glass-card p-4 text-center border-l-4 border-l-orange-500">
                <Target className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">BMI</p>
                <p className="text-lg font-bold text-foreground">
                  {plan.bmi || '—'} <span className="text-xs font-normal text-muted-foreground">{plan.bmiCategory || ''}</span>
                </p>
              </Card>
            </div>

            {/* Explanation */}
            {plan.explanation && (
              <Card className="glass-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">How This Plan Helps You</h3>
                </div>
                <p className="text-foreground leading-relaxed">{plan.explanation}</p>
              </Card>
            )}

            {/* Daily plans */}
            {plan.dailyPlans && plan.dailyPlans.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Apple className="h-5 w-5 text-accent" />
                  Meal Plans ({plan.dailyPlans.length} day{plan.dailyPlans.length > 1 ? 's' : ''})
                </h3>
                {plan.dailyPlans.map((dp, idx) => (
                  <DailyPlanCard key={idx} dayPlan={dp} dayIndex={idx} />
                ))}
              </div>
            ) : plan.aiGeneratedPlan ? (
              /* Fallback: raw AI text */
              <Card className="glass-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Your Diet Plan</h3>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed bg-background/50 p-4 rounded-lg border border-border/30">
                  {plan.aiGeneratedPlan}
                </pre>
              </Card>
            ) : (
              <Card className="glass-card p-8 text-center">
                <p className="text-muted-foreground">No meal plan data available.</p>
              </Card>
            )}

            {/* Tips */}
            {plan.tips && plan.tips.length > 0 && (
              <Card className="glass-card p-6 border-l-4 border-l-yellow-500">
                <div className="flex items-center gap-3 mb-4">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-foreground">Pro Tips</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {plan.tips.map((tip, i) => (
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
                  {plan.disclaimer || 'This diet plan is for informational purposes only and does not replace professional medical advice.'}
                </p>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="flex-1 medical-gradient text-white gap-2" onClick={() => navigate('/diet-plans')}>
                <RefreshCw className="h-4 w-4" />
                Create New Plan
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate('/diet/history')}>
                <Calendar className="h-4 w-4" />
                View Diet History
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DietPlanDetailPage;
