import RecipeCard from './RecipeCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Info } from 'lucide-react';

/**
 * RecipeList — Renders the 4 generated recipes + healthier alternatives + disclaimer
 */
const RecipeList = ({ recipes, healthierAlternatives, disclaimer, userProfile }) => {
  if (!recipes || recipes.length === 0) return null;

  return (
    <div className="space-y-8">
      {/* Results header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">
          🍽️ Your Personalized Recipes
        </h2>
        <p className="text-muted-foreground">
          {recipes.length} healthy halal recipes tailored to your profile
          {userProfile?.goal && (
            <> · Goal: <span className="font-medium text-primary">{userProfile.goal}</span></>
          )}
          {userProfile?.calories && (
            <> · Target: <span className="font-medium text-primary">{userProfile.calories} kcal/day</span></>
          )}
        </p>
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recipes.map((recipe, index) => (
          <RecipeCard key={index} recipe={recipe} index={index} />
        ))}
      </div>

      {/* Healthier alternatives — STEP 11 */}
      {healthierAlternatives && healthierAlternatives.length > 0 && (
        <Card className="glass-card p-5">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            💡 Healthier Ingredient Alternatives
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            For even better nutrition, consider these swaps in future cooking:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {healthierAlternatives.map((alt, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10"
              >
                <Badge variant="outline" className="text-xs line-through text-muted-foreground">
                  {alt.original}
                </Badge>
                <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-primary">{alt.healthier}</span>
                  {alt.benefit && (
                    <p className="text-[11px] text-muted-foreground">{alt.benefit}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
        <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground italic">
          {disclaimer || 'This suggestion is for informational purposes only and does not replace professional medical advice.'}
        </p>
      </div>
    </div>
  );
};

export default RecipeList;
