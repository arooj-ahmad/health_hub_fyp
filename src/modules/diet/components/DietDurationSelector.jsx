/**
 * DietDurationSelector — Step 2 of the diet planner
 *
 * Shows auto-recommended duration + manual duration options.
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight, Clock } from 'lucide-react';
import { DURATION_OPTIONS, autoDuration } from '../utils/mealHelpers';

export default function DietDurationSelector({ computed, effectiveGoal, onConfirm }) {
  if (!computed) return null;

  const autoDays = autoDuration(effectiveGoal, computed.bmi);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">Plan Duration</h3>
          <p className="text-sm text-muted-foreground">
            Goal: <span className="font-medium text-foreground">{effectiveGoal}</span> · 
            Target: <span className="font-medium text-foreground">{computed.cal} kcal/day</span>
          </p>
        </div>
      </div>

      {/* Auto duration */}
      <Card
        className="glass-card p-6 border-2 border-primary hover-lift smooth-transition cursor-pointer"
        onClick={() => onConfirm(autoDays, 'auto')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-foreground">{autoDays} Day{autoDays > 1 ? 's' : ''}</h4>
                <Badge className="bg-primary text-white text-xs">Recommended</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Auto-selected based on your goal and BMI
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary" />
        </div>
      </Card>

      {/* Manual options */}
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-3">Or Pick a Duration</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DURATION_OPTIONS.filter(d => d.value !== autoDays).map(opt => (
            <Card
              key={opt.value}
              className="glass-card p-4 text-center hover-lift smooth-transition cursor-pointer hover:border-accent"
              onClick={() => onConfirm(opt.value, 'manual')}
            >
              <p className="text-2xl font-bold text-foreground mb-1">{opt.value}</p>
              <p className="text-sm text-muted-foreground">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
