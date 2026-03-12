/**
 * MealCard — Renders a single meal (breakfast/lunch/snack/dinner)
 *
 * Shows meal name, food items with portion + macros, and meal totals.
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MEAL_SLOTS } from '../utils/mealHelpers';

function slotMeta(slotKey) {
  return MEAL_SLOTS.find(s => s.key === slotKey) || { label: slotKey, emoji: '🍽️' };
}

export default function MealCard({ meal }) {
  if (!meal) return null;

  const meta = slotMeta(meal.slot);

  return (
    <Card className="bg-background/60 border-border/50 p-4 hover-lift smooth-transition">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{meta.emoji}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{meal.name || meta.label}</h4>
          <p className="text-xs text-muted-foreground">{meta.label}</p>
        </div>
        <Badge variant="secondary" className="text-xs font-mono">
          {meal.calories || 0} kcal
        </Badge>
      </div>

      {/* Food items */}
      {meal.items && meal.items.length > 0 && (
        <div className="space-y-2 mb-3">
          {meal.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg bg-background/80 border border-border/20">
              <div className="flex-1">
                <span className="text-foreground">{item.food}</span>
                <span className="text-muted-foreground ml-2">— {item.quantity}</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">
                {item.calories} kcal
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Macro summary row */}
      <div className="flex gap-3 text-xs text-muted-foreground border-t border-border/20 pt-2">
        <span>P: <span className="font-semibold text-foreground">{meal.protein || 0}g</span></span>
        <span>C: <span className="font-semibold text-foreground">{meal.carbs || 0}g</span></span>
        <span>F: <span className="font-semibold text-foreground">{meal.fat || 0}g</span></span>
      </div>
    </Card>
  );
}
