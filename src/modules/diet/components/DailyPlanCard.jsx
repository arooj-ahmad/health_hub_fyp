/**
 * DailyPlanCard — A single day's full meal layout
 *
 * Shows day number, 4 MealCards, plus a daily summary bar.
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import MealCard from './MealCard';
import { summariseDay } from '../services/nutritionAnalysisService';

export default function DailyPlanCard({ dayPlan, dayIndex }) {
  if (!dayPlan) return null;

  const summary = summariseDay(dayPlan);
  const dayNum = dayPlan.day || dayIndex + 1;

  // Sort meals in slot order
  const slotOrder = { breakfast: 0, lunch: 1, snack: 2, dinner: 3 };
  const sortedMeals = [...(dayPlan.meals || [])].sort(
    (a, b) => (slotOrder[a.slot] ?? 9) - (slotOrder[b.slot] ?? 9),
  );

  return (
    <Card className="glass-card p-5 border-t-4 border-t-primary">
      {/* Day header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow text-white flex items-center justify-center font-bold">
            {dayNum}
          </div>
          <h3 className="text-lg font-bold text-foreground">Day {dayNum}</h3>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          {summary.totalCalories} kcal
        </Badge>
      </div>

      {/* Meals */}
      <div className="space-y-3 mb-4">
        {sortedMeals.map((meal, idx) => (
          <MealCard key={idx} meal={meal} />
        ))}
      </div>

      {/* Daily summary bar */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">Day {dayNum} Totals</span>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-muted-foreground">
            Cal: <span className="font-bold text-foreground">{summary.totalCalories}</span>
          </span>
          <span className="text-muted-foreground">
            P: <span className="font-bold text-foreground">{summary.protein}g</span>
          </span>
          <span className="text-muted-foreground">
            C: <span className="font-bold text-foreground">{summary.carbs}g</span>
          </span>
          <span className="text-muted-foreground">
            F: <span className="font-bold text-foreground">{summary.fat}g</span>
          </span>
        </div>
      </div>
    </Card>
  );
}
