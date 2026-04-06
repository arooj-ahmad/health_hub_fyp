import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { db } from '@/config/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, Apple, Clock, Target } from 'lucide-react';

const SLOT_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];

function toTitle(text = '') {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dayNumberFromKey(dayKey, fallback) {
  const match = String(dayKey).match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

function normalizeMeal(slot, value) {
  if (value == null) return null;

  if (typeof value === 'string') {
    return {
      slot,
      name: toTitle(slot),
      items: [{ food: value }],
    };
  }

  if (Array.isArray(value)) {
    // If already meal-item list, wrap as one slot meal.
    return {
      slot,
      name: toTitle(slot),
      items: value,
    };
  }

  if (typeof value === 'object') {
    // Already in meal shape
    if (Array.isArray(value.items) || value.name || value.calories || value.slot) {
      return {
        slot: value.slot || slot,
        ...value,
      };
    }

    // Single food object fallback
    return {
      slot,
      name: toTitle(slot),
      items: [value],
    };
  }

  return null;
}

function normalizeDayMeals(dayMeals) {
  if (!dayMeals) return [];

  if (Array.isArray(dayMeals)) {
    // Already array format used by AI response and existing UI
    return dayMeals;
  }

  if (typeof dayMeals !== 'object') return [];

  if (Array.isArray(dayMeals.meals)) {
    return dayMeals.meals;
  }

  const entries = Object.entries(dayMeals);
  const preferred = SLOT_ORDER.filter((slot) => slot in dayMeals);
  const extras = entries
    .map(([key]) => key)
    .filter((key) => !SLOT_ORDER.includes(key));

  const slotKeys = [...preferred, ...extras];

  return slotKeys
    .map((slot) => normalizeMeal(slot, dayMeals[slot]))
    .filter(Boolean);
}

function parseAIPlan(plan) {
  if (!plan) return null;

  if (typeof plan === 'string') {
    try {
      const cleaned = plan.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('AI plan parse error:', error);
      return null;
    }
  }

  return plan;
}

function normalizePlanDays(plan) {
  if (!plan) return [];

  if (Array.isArray(plan.dailyPlans) && plan.dailyPlans.length > 0) {
    return plan.dailyPlans;
  }

  const parsedPlan = parseAIPlan(plan.aiGeneratedPlan);
  if (Array.isArray(parsedPlan?.dailyPlans) && parsedPlan.dailyPlans.length > 0) {
    return parsedPlan.dailyPlans;
  }

  if (Array.isArray(parsedPlan) && parsedPlan.length > 0) {
    return parsedPlan;
  }

  const meals = plan.meals;
  if (!meals) return [];

  // meals as direct array (single-day fallback)
  if (Array.isArray(meals)) {
    return [{ day: 1, meals }];
  }

  if (typeof meals !== 'object') return [];

  const entries = Object.entries(meals);
  if (entries.length === 0) return [];

  // meals is directly a single day object: { breakfast, lunch, ... }
  const hasDirectSlots = SLOT_ORDER.some((slot) => Object.prototype.hasOwnProperty.call(meals, slot));
  if (hasDirectSlots) {
    return [{ day: 1, meals: normalizeDayMeals(meals) }];
  }

  // meals is a day map: { day1: {...}, day2: {...} }
  return entries
    .sort(([a], [b]) => dayNumberFromKey(a, 0) - dayNumberFromKey(b, 0))
    .map(([dayKey, dayMeals], index) => ({
      day: dayNumberFromKey(dayKey, index + 1),
      meals: normalizeDayMeals(dayMeals),
    }));
}

const DietPlanDetails = () => {
  const { planId } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchPlan = async () => {
      if (!planId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setNotFound(false);

        const docRef = doc(db, 'dietPlans', planId);
        const docSnap = await getDoc(docRef);

        if (cancelled) return;

        if (!docSnap.exists()) {
          setPlan(null);
          setNotFound(true);
          return;
        }

        setPlan({ id: docSnap.id, ...docSnap.data() });
      } catch (error) {
        console.error('Failed to fetch diet plan:', error);
        if (!cancelled) {
          setPlan(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPlan();

    return () => {
      cancelled = true;
    };
  }, [planId]);

  const mealsByDay = useMemo(() => normalizePlanDays(plan), [plan]);
  const goal = plan?.goal || plan?.goalType || '—';
  const duration = plan?.duration || `${plan?.durationDays || 0} days`;
  const calories = plan?.targetCalories || plan?.calorieTarget || 0;
  const warnings = Array.isArray(plan?.healthWarnings)
    ? plan.healthWarnings
    : Array.isArray(plan?.healthConditions)
      ? plan.healthConditions
      : [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/diet/history')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Diet History
        </Button>

        {loading && (
          <Card className="glass-card p-12 text-center">
            <LoadingSpinner />
            <p className="text-muted-foreground mt-4">Loading diet plan...</p>
          </Card>
        )}

        {!loading && notFound && (
          <Card className="glass-card p-10 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">Diet plan not found</p>
          </Card>
        )}

        {!loading && !notFound && plan && (
          <div className="space-y-5">
            <Card className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Apple className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Diet Plan Details</h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="p-4 border-l-4 border-l-primary">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Goal</span>
                  </div>
                  <p className="text-base font-semibold text-foreground">{goal}</p>
                </Card>

                <Card className="p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Duration</span>
                  </div>
                  <p className="text-base font-semibold text-foreground">{duration}</p>
                </Card>

                <Card className="p-4 border-l-4 border-l-orange-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-orange-500" />
                    <span className="text-xs text-muted-foreground">Calories</span>
                  </div>
                  <p className="text-base font-semibold text-foreground">{calories} kcal/day</p>
                </Card>
              </div>
            </Card>

            {warnings.length > 0 && (
              <Card className="glass-card p-5 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <h2 className="text-sm font-semibold text-foreground">Health Warnings</h2>
                </div>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="glass-card p-5 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Meals</h2>

              {mealsByDay.map((dayPlan, dayIndex) => (
                <Card key={`day-${dayPlan.day || dayIndex + 1}`} className="p-4 space-y-3 border-border/40">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Day {dayPlan.day || dayIndex + 1}</Badge>
                    {dayPlan.totalCalories && (
                      <span className="text-xs text-muted-foreground">{dayPlan.totalCalories} kcal</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(dayPlan.meals || []).map((meal, mealIndex) => (
                      <div key={`meal-${mealIndex}`} className="rounded-md border border-border/50 p-3">
                        <p className="text-sm font-semibold text-foreground">
                          {meal.name || meal.slot || `Meal ${mealIndex + 1}`}
                        </p>

                        {Array.isArray(meal.items) && meal.items.length > 0 && (
                          <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                            {meal.items.map((item, itemIndex) => (
                              <li key={`item-${itemIndex}`}>
                                {item.food || item.name || 'Food item'}
                                {item.quantity ? ` - ${item.quantity}` : ''}
                                {item.calories ? ` (${item.calories} kcal)` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DietPlanDetails;
