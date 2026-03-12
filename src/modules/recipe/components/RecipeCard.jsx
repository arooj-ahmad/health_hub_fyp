import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Flame, Users, ChefHat, Dumbbell, Wheat, Droplets, Leaf } from 'lucide-react';
import { useState } from 'react';

const RECIPE_EMOJIS = ['🍗', '🥗', '🍲', '🍛', '🥘', '🍜', '🌯', '🥙'];

const RecipeCard = ({ recipe, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const emoji = RECIPE_EMOJIS[index % RECIPE_EMOJIS.length];

  return (
    <Card className="glass-card overflow-hidden hover-lift smooth-transition group">
      {/* Hero section */}
      <div className="relative h-44 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 flex items-center justify-center overflow-hidden">
        {recipe.image && !imgFailed ? (
          <img
            src={recipe.image}
            alt={recipe.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-6xl group-hover:scale-110 transition-transform relative z-10">
            {emoji}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <Badge
          variant="secondary"
          className="absolute top-3 left-3 text-xs bg-background/80 backdrop-blur-sm z-10"
        >
          Recipe {index + 1}
        </Badge>
        <Badge
          className="absolute top-3 right-3 text-xs bg-primary/80 text-white backdrop-blur-sm z-10"
        >
          {recipe.difficulty || 'Easy'}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title */}
        <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-primary transition-colors">
          {recipe.name}
        </h3>

        {/* Quick stats */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {recipe.cookingTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary/70" />
              <span>{recipe.cookingTime}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="font-medium text-foreground">~{recipe.caloriesPerServing} kcal</span>
          </div>
          {recipe.servings && (
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary/70" />
              <span>{recipe.servings} serving{recipe.servings > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Macronutrients bar */}
        {recipe.macronutrients && (
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
              <Dumbbell className="h-3.5 w-3.5 mx-auto text-blue-500 mb-1" />
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{recipe.macronutrients.protein}</p>
              <p className="text-[10px] text-muted-foreground">Protein</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
              <Wheat className="h-3.5 w-3.5 mx-auto text-amber-500 mb-1" />
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{recipe.macronutrients.carbohydrates}</p>
              <p className="text-[10px] text-muted-foreground">Carbs</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900">
              <Droplets className="h-3.5 w-3.5 mx-auto text-red-500 mb-1" />
              <p className="text-xs font-bold text-red-600 dark:text-red-400">{recipe.macronutrients.fats}</p>
              <p className="text-[10px] text-muted-foreground">Fats</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900">
              <Leaf className="h-3.5 w-3.5 mx-auto text-green-500 mb-1" />
              <p className="text-xs font-bold text-green-600 dark:text-green-400">{recipe.macronutrients.fiber}</p>
              <p className="text-[10px] text-muted-foreground">Fiber</p>
            </div>
          </div>
        )}

        {/* Ingredients */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-primary" />
            Ingredients
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {recipe.ingredients && recipe.ingredients.map((ing, i) => (
              <Badge key={i} variant="outline" className="text-xs py-1">
                {typeof ing === 'object' ? `${ing.quantity} ${ing.item}` : ing}
              </Badge>
            ))}
          </div>
        </div>

        {/* Expandable: Instructions & Health Note */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {expanded ? 'Hide Details ▲' : 'Show Cooking Steps & Health Info ▼'}
          </button>

          {expanded && (
            <div className="mt-3 space-y-4 animate-fade-in">
              {/* Instructions */}
              {recipe.instructions && recipe.instructions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">📝 Cooking Method</h4>
                  <ol className="space-y-2 pl-1">
                    {recipe.instructions.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Health note */}
              {recipe.healthNote && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
                    💚 Why This Recipe is Healthy
                  </h4>
                  <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">
                    {recipe.healthNote}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Halal badge */}
        <div className="flex gap-1.5 pt-1">
          <Badge variant="secondary" className="text-xs">✅ Halal</Badge>
          <Badge variant="secondary" className="text-xs">🇵🇰 Pakistani</Badge>
        </div>
      </div>
    </Card>
  );
};

export default RecipeCard;
