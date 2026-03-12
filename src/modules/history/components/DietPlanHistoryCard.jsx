/**
 * DietPlanHistoryCard — Displays one saved diet-plan-generation entry.
 *
 * Shows: date, goal type, duration, calorie target, View button.
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, Clock, Apple, Eye, AlertTriangle } from 'lucide-react';

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function DietPlanHistoryCard({ entry, onView }) {
  const daysCount = entry.durationDays || 0;
  const goal = entry.goalType || '—';
  const cal = entry.calorieTarget || 0;
  const warnings = entry.healthWarnings || [];

  return (
    <Card className="glass-card p-5 hover-lift smooth-transition">
      {/* Top: date + manual badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(entry.createdAt)}</span>
        </div>
        {entry.manualGoalUsed && (
          <Badge variant="secondary" className="text-[10px] bg-yellow-500/10 text-yellow-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Manual Goal
          </Badge>
        )}
      </div>

      {/* Goal */}
      <div className="flex items-center gap-2 mb-3">
        <Apple className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">{goal}</h3>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 text-accent" />
          <span>{daysCount} day{daysCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="h-4 w-4 text-primary" />
          <span>{cal} kcal/day</span>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="flex items-center gap-1.5 text-yellow-600 mb-3 text-xs">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{warnings.length} health warning{warnings.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* View */}
      <Button variant="outline" className="w-full gap-2" onClick={() => onView(entry)}>
        <Eye className="h-4 w-4" />
        View Diet Plan
      </Button>
    </Card>
  );
}
