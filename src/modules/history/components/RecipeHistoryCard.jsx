/**
 * RecipeHistoryCard — Displays one saved recipe-generation entry.
 *
 * Shows: date, ingredients used, recipe count, health warnings badge, View button.
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChefHat, AlertTriangle, Eye } from 'lucide-react';

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function RecipeHistoryCard({ entry, onView }) {
  const ingredients = entry.ingredientsInput || [];
  const recipeCount = (entry.generatedRecipes || []).length;
  const warnings = entry.healthWarnings || [];

  return (
    <Card className="glass-card p-5 hover-lift smooth-transition">
      {/* Top: Date */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(entry.createdAt)}</span>
        </div>
        {entry.overrideUsed && (
          <Badge variant="secondary" className="text-[10px] bg-yellow-500/10 text-yellow-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Override
          </Badge>
        )}
      </div>

      {/* Ingredients */}
      <div className="mb-3">
        <p className="text-sm font-medium text-foreground mb-1">Ingredients</p>
        <div className="flex flex-wrap gap-1.5">
          {ingredients.slice(0, 6).map((ing, i) => (
            <Badge key={i} variant="outline" className="text-xs font-normal">
              {typeof ing === 'string' ? ing : String(ing)}
            </Badge>
          ))}
          {ingredients.length > 6 && (
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
              +{ingredients.length - 6} more
            </Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ChefHat className="h-4 w-4 text-primary" />
          <span><strong className="text-foreground">{recipeCount}</strong> recipe{recipeCount !== 1 ? 's' : ''}</span>
        </div>
        {warnings.length > 0 && (
          <div className="flex items-center gap-1.5 text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* View */}
      <Button variant="outline" className="w-full gap-2" onClick={() => onView(entry)}>
        <Eye className="h-4 w-4" />
        View Recipes
      </Button>
    </Card>
  );
}
