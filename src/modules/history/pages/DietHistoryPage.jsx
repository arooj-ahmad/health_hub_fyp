/**
 * DietHistoryPage — Shows the user's previously generated diet plans.
 *
 * Fetches from `dietPlans` collection (primary, where data lives)
 * with fallback to `dietplans_history`. Displays cards and routes
 * to a dedicated details page on "View".
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Apple, X, AlertTriangle, Target,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserDietPlanHistory } from '@/services/storage/dietPlanStorageService';
import DietPlanHistoryCard from '../components/DietPlanHistoryCard';

// ── Meal slot emoji map ──────────────────────────────────────────────────────
const SLOT_EMOJI = { breakfast: '🍳', lunch: '🍱', snack: '🍵', dinner: '🍽️' };

const DietHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const data = await getUserDietPlanHistory(user.uid, 20);
        setEntries(data);
      } catch (e) {
        console.error('Failed to load diet plan history:', e);
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
              <Apple className="h-8 w-8 text-primary" />
              Diet Plan History
            </h1>
            <p className="text-muted-foreground mt-1">Your previously generated diet plans</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/diet-plans')}>
            <Apple className="h-4 w-4" />
            Generate New
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <Card className="glass-card p-12 text-center">
            <LoadingSpinner />
            <p className="text-muted-foreground mt-4">Loading diet plan history…</p>
          </Card>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <Card className="glass-card p-12 text-center">
            <Apple className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No saved diet plans yet.</h2>
            <p className="text-muted-foreground mb-6">
              Generate a diet plan and it will appear here automatically.
            </p>
            <Button className="medical-gradient text-white gap-2" onClick={() => navigate('/diet-plans')}>
              <Apple className="h-4 w-4" />
              Create Diet Plan
            </Button>
          </Card>
        )}

        {/* Cards grid */}
        {!loading && entries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <DietPlanHistoryCard
                key={entry.id}
                entry={entry}
                onView={(plan) => navigate(`/diet-plan/${plan.id}`)}
              />
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
                  <h2 className="text-xl font-bold text-foreground">
                    {selected.goalType || 'Diet Plan'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.durationDays} day{selected.durationDays !== 1 ? 's' : ''} · {selected.calorieTarget} kcal/day
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

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

                {/* Daily plans */}
                {(selected.dailyPlans || []).map((dayPlan, dIdx) => (
                  <Card key={dIdx} className="glass-card p-5 border-t-4 border-t-primary">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                        {dayPlan.day || dIdx + 1}
                      </div>
                      <h3 className="font-bold text-foreground">Day {dayPlan.day || dIdx + 1}</h3>
                      {dayPlan.totalCalories && (
                        <Badge variant="outline" className="ml-auto text-xs font-mono">
                          {dayPlan.totalCalories} kcal
                        </Badge>
                      )}
                    </div>

                    {/* Meals */}
                    <div className="space-y-2">
                      {(dayPlan.meals || []).map((meal, mIdx) => (
                        <div key={mIdx} className="flex gap-3 p-3 rounded-lg bg-background/80 border border-border/30">
                          <span className="text-xl flex-shrink-0">
                            {SLOT_EMOJI[meal.slot] || '🍽️'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">
                              {meal.name || meal.slot || 'Meal'}
                            </p>
                            {meal.items && Array.isArray(meal.items) && (
                              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                {meal.items.map((item, iIdx) => (
                                  <li key={iIdx}>
                                    {item.food || item.name} — {item.quantity || ''}{' '}
                                    <span className="text-foreground/60">({item.calories || 0} kcal)</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground">
                              {meal.calories && <span>Cal: {meal.calories}</span>}
                              {meal.protein && <span>P: {meal.protein}g</span>}
                              {meal.carbs && <span>C: {meal.carbs}g</span>}
                              {meal.fat && <span>F: {meal.fat}g</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Day summary */}
                    {(dayPlan.totalProtein || dayPlan.totalCarbs || dayPlan.totalFat) && (
                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                        <span>Protein: <strong className="text-foreground">{dayPlan.totalProtein}g</strong></span>
                        <span>Carbs: <strong className="text-foreground">{dayPlan.totalCarbs}g</strong></span>
                        <span>Fat: <strong className="text-foreground">{dayPlan.totalFat}g</strong></span>
                      </div>
                    )}
                  </Card>
                ))}

                {(selected.dailyPlans || []).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No plan data available.</p>
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

export default DietHistoryPage;
