/**
 * RecipeHistoryPage — Shows the user's previously generated recipes.
 *
 * Fetches from `recipes_history` collection and displays cards.
 * Clicking "View" opens a detail modal with the full recipes.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChefHat, X, AlertTriangle, UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserRecipeHistory } from '@/services/storage/recipeStorageService';
import RecipeHistoryCard from '../components/RecipeHistoryCard';

const RecipeHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // entry for detail modal

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const data = await getUserRecipeHistory(user.uid, 20);
        setEntries(data);
      } catch (e) {
        console.error('Failed to load recipe history:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-primary" />
              Recipe History
            </h1>
            <p className="text-muted-foreground mt-1">Your previously generated recipes</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/recipes')}>
            <UtensilsCrossed className="h-4 w-4" />
            Generate New
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <Card className="glass-card p-12 text-center">
            <LoadingSpinner />
            <p className="text-muted-foreground mt-4">Loading recipe history…</p>
          </Card>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <Card className="glass-card p-12 text-center">
            <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No saved recipes yet.</h2>
            <p className="text-muted-foreground mb-6">
              Generate some recipes and they will appear here automatically.
            </p>
            <Button className="medical-gradient text-white gap-2" onClick={() => navigate('/recipes')}>
              <UtensilsCrossed className="h-4 w-4" />
              Generate Recipes
            </Button>
          </Card>
        )}

        {/* Cards grid */}
        {!loading && entries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <RecipeHistoryCard key={entry.id} entry={entry} onView={setSelected} />
            ))}
          </div>
        )}

        {/* ── Detail Modal Overlay ──────────────────────────────────────── */}
        {selected && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-12 overflow-y-auto">
            <div className="bg-background rounded-xl shadow-2xl w-full max-w-3xl mx-4 mb-12">
              {/* Modal header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Generated Recipes</h2>
                  <p className="text-sm text-muted-foreground">
                    {(selected.ingredientsInput || []).join(', ')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Health warnings */}
                {selected.healthWarnings?.length > 0 && (
                  <Card className="p-4 bg-yellow-500/5 border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-semibold text-sm text-yellow-700">Health Warnings</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {selected.healthWarnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </Card>
                )}

                {/* Recipes */}
                {(selected.generatedRecipes || []).map((recipe, idx) => (
                  <Card key={idx} className="glass-card overflow-hidden">
                    {/* Recipe image */}
                    {recipe.image && (
                      <img
                        src={recipe.image}
                        alt={recipe.name || recipe.title || `Recipe ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-40 object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="p-5">
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {recipe.name || recipe.title || `Recipe ${idx + 1}`}
                    </h3>
                    {recipe.description && (
                      <p className="text-sm text-muted-foreground mb-3">{recipe.description}</p>
                    )}

                    {/* Macros / calories row */}
                    {(recipe.calories || recipe.totalCalories) && (
                      <div className="flex flex-wrap gap-3 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {recipe.calories || recipe.totalCalories} kcal
                        </Badge>
                        {recipe.protein && <Badge variant="outline" className="text-xs">P {recipe.protein}g</Badge>}
                        {recipe.carbs && <Badge variant="outline" className="text-xs">C {recipe.carbs}g</Badge>}
                        {recipe.fat && <Badge variant="outline" className="text-xs">F {recipe.fat}g</Badge>}
                      </div>
                    )}

                    {/* Ingredients */}
                    {recipe.ingredients && (
                      <>
                        <p className="font-semibold text-sm text-foreground mb-1">Ingredients</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground mb-3 space-y-0.5">
                          {(Array.isArray(recipe.ingredients) ? recipe.ingredients : [recipe.ingredients]).map((ing, j) => (
                            <li key={j}>{typeof ing === 'object' ? `${ing.item || ing.name} — ${ing.quantity || ing.amount || ''}` : ing}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {/* Instructions */}
                    {recipe.instructions && (
                      <>
                        <p className="font-semibold text-sm text-foreground mb-1">Instructions</p>
                        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                          {(Array.isArray(recipe.instructions) ? recipe.instructions : [recipe.instructions]).map((step, j) => (
                            <li key={j}>{typeof step === 'object' ? step.step || step.text || JSON.stringify(step) : step}</li>
                          ))}
                        </ol>
                      </>
                    )}
                    </div>
                  </Card>
                ))}

                {(selected.generatedRecipes || []).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No recipe data available.</p>
                )}
              </div>

              {/* Modal footer */}
              <div className="p-4 border-t border-border flex justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RecipeHistoryPage;
