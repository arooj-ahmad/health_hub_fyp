/**
 * DietGoalSelector — Step 1 of the diet planner
 *
 * Shows the auto-recommended goal + lets user pick a manual override.
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, ArrowRight, Info } from 'lucide-react';
import { GOAL_OPTIONS } from '../utils/mealHelpers';

export default function DietGoalSelector({ computed, onConfirm }) {
  if (!computed) return null;

  const autoGoalValue = computed.goal;

  return (
    <div className="space-y-6">
      {/* Computed summary */}
      <Card className="glass-card p-6 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Your Health Summary</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block">BMI</span>
            <span className="font-bold text-lg">{computed.bmi}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Category</span>
            <span className={`font-bold text-lg ${
              computed.cat === 'Normal' ? 'text-green-600' :
              computed.cat === 'Overweight' ? 'text-yellow-600' :
              computed.cat === 'Obese' ? 'text-red-600' : 'text-blue-600'
            }`}>
              {computed.cat}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Target Weight</span>
            <span className="font-bold text-lg">{computed.tw ? `${computed.tw} kg` : 'Healthy'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Daily Calories</span>
            <span className="font-bold text-lg">{computed.cal} kcal</span>
          </div>
        </div>
      </Card>

      {/* Auto goal */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-3">Recommended Goal</h3>
        <Card
          className="glass-card p-6 border-2 border-primary hover-lift smooth-transition cursor-pointer"
          onClick={() => onConfirm(autoGoalValue, 'auto')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-foreground">{autoGoalValue}</h4>
                  <Badge className="bg-primary text-white text-xs">Recommended</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on your BMI ({computed.bmi}) — {computed.cat}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
        </Card>
      </div>

      {/* Manual goal options */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-3">Or Choose Manually</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {GOAL_OPTIONS.filter(g => g.value !== autoGoalValue).map(goal => (
            <Card
              key={goal.value}
              className="glass-card p-4 hover-lift smooth-transition cursor-pointer hover:border-accent"
              onClick={() => onConfirm(goal.value, 'manual')}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{goal.icon}</span>
                <div>
                  <h4 className="font-semibold text-foreground">{goal.label}</h4>
                  <p className="text-xs text-muted-foreground">{goal.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          ⚠️ Choosing a goal that differs from the recommendation may trigger a safety warning.
        </p>
      </div>
    </div>
  );
}
