import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StatCard from "@/components/StatCard";
import { useNavigate } from "react-router-dom";
import { Activity, Calendar, Plus, TrendingDown, TrendingUp, Weight, Edit, Trash2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserProgress, getUserProfile, getUserDietPlans, deleteProgressLog } from "@/services/firestoreService";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

// Helper for BMI category label
function bmiCategoryLabel(bmi) {
  if (bmi == null) return "N/A";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

const Progress = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedAnalysis, setExpandedAnalysis] = useState(null);
  const [stats, setStats] = useState({
    currentWeight: null,
    bmi: null,
    weeklyChange: 0,
    goalProgress: 0,
    startWeight: null,
    goalWeight: null
  });

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const [progress, profile, dietPlans] = await Promise.all([
          getUserProgress(user.uid, 30),
          getUserProfile(user.uid),
          getUserDietPlans(user.uid, 'active')
        ]);
        
        // Sort by date descending (newest first) to ensure consistency
        const sortedProgress = [...progress].sort((a, b) => {
          const dateA = a.date?.toDate?.() || new Date(a.date);
          const dateB = b.date?.toDate?.() || new Date(b.date);
          return dateB - dateA;
        });
        
        setProgressData(sortedProgress);
        
        // Get user's starting weight and goal from profile or diet plan
        const startWeight = profile?.healthProfile?.weight || 55;
        const height = profile?.healthProfile?.height;
        const activePlan = dietPlans && dietPlans.length > 0 ? dietPlans[0] : null;
        const goalWeight = activePlan?.targetWeight || profile?.healthProfile?.targetWeight || startWeight - 5;
        
        // Calculate BMI
        let bmi = profile?.healthProfile?.BMI;
        if (!bmi && startWeight && height) {
          bmi = parseFloat((startWeight / ((height / 100) ** 2)).toFixed(1));
        }
        
        // Calculate stats with real Firestore data
        if (sortedProgress.length > 0) {
          // Latest entry (most recent)
          const latestEntry = sortedProgress[0];
          const currentWeight = parseFloat(latestEntry.weight);
          
          // Earliest entry (oldest) as starting point
          const earliestEntry = sortedProgress[sortedProgress.length - 1];
          const firstWeight = parseFloat(earliestEntry.weight);
          
          // Use earliest logged weight or profile weight as start
          const actualStartWeight = firstWeight || startWeight;
          
          // Calculate weekly change (last 7 days)
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          const lastWeekEntries = sortedProgress.filter(p => {
            const entryDate = p.date?.toDate?.() || new Date(p.date);
            return entryDate >= oneWeekAgo;
          });
          
          let weeklyChange = 0;
          if (lastWeekEntries.length >= 2) {
            // Most recent vs oldest in last week
            const weekLatest = lastWeekEntries[0].weight;
            const weekOldest = lastWeekEntries[lastWeekEntries.length - 1].weight;
            weeklyChange = weekLatest - weekOldest;
          } else if (lastWeekEntries.length === 1 && sortedProgress.length > 1) {
            // Compare with previous entry
            weeklyChange = lastWeekEntries[0].weight - sortedProgress[1].weight;
          }
          
          // Calculate total change and goal progress
          const totalChange = currentWeight - actualStartWeight;
          const goalDiff = actualStartWeight - goalWeight;
          
          // Determine progress based on goal direction
          let progressPercent = 0;
          if (Math.abs(goalDiff) > 0.1) {
            if (goalDiff > 0) {
              // Goal is to lose weight
              const lost = actualStartWeight - currentWeight;
              progressPercent = (lost / goalDiff) * 100;
            } else {
              // Goal is to gain weight
              const gained = currentWeight - actualStartWeight;
              progressPercent = (gained / Math.abs(goalDiff)) * 100;
            }
          }
          
          // Calculate current BMI if weight changed
          let currentBmi = bmi;
          if (height && currentWeight !== startWeight) {
            currentBmi = parseFloat((currentWeight / ((height / 100) ** 2)).toFixed(1));
          }
          
          setStats({
            currentWeight: currentWeight,
            bmi: currentBmi || latestEntry.bmi || bmi || null,
            weeklyChange: weeklyChange,
            goalProgress: Math.min(Math.max(progressPercent, 0), 100),
            startWeight: actualStartWeight,
            goalWeight: goalWeight,
            totalChange: totalChange
          });
        } else {
          // No progress data yet, use profile data
          setStats({
            currentWeight: startWeight,
            bmi: bmi || null,
            weeklyChange: 0,
            goalProgress: 0,
            startWeight: startWeight,
            goalWeight: goalWeight,
            totalChange: 0
          });
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user, refreshKey]);

  const handleDeleteEntry = async (logId) => {
    if (!confirm('Are you sure you want to delete this progress entry?')) {
      return;
    }
    
    try {
      await deleteProgressLog(logId);
      toast({
        title: "Entry Deleted",
        description: "Progress entry has been successfully deleted.",
      });
      // Refresh data
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting progress entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditEntry = (entry) => {
    // Navigate to log page with entry data
    navigate('/progress/log', { state: { editEntry: entry } });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  // Prepare weekly data for chart (last 4 weeks)
  const getWeeklyData = () => {
    if (progressData.length === 0) return [];
    
    const weeklyEntries = [];
    const now = new Date();
    
    // Group entries by week (last 4 weeks)
    for (let weekNum = 0; weekNum < 4; weekNum++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (weekNum + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - weekNum * 7);
      
      // Find entries in this week
      const weekEntries = progressData.filter(p => {
        const entryDate = p.date?.toDate?.() || new Date(p.date);
        return entryDate >= weekStart && entryDate < weekEnd;
      });
      
      if (weekEntries.length > 0) {
        // Use the most recent entry in this week
        const entry = weekEntries[0];
        const date = entry.date?.toDate?.() || new Date(entry.date);
        weeklyEntries.push({
          week: `Week ${4 - weekNum}`,
          weight: parseFloat(entry.weight),
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    }
    
    // If we don't have 4 weeks, use last 4 entries
    if (weeklyEntries.length < 4 && progressData.length > 0) {
      return progressData.slice(0, Math.min(4, progressData.length)).reverse().map((p, idx) => {
        const date = p.date?.toDate?.() || new Date(p.date);
        return {
          week: `Week ${idx + 1}`,
          weight: parseFloat(p.weight),
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
      });
    }
    
    return weeklyEntries.reverse();
  };
  
  const weeklyData = getWeeklyData();

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Progress Tracking</h1>
            <p className="text-muted-foreground text-base md:text-lg">Monitor your health journey with detailed insights</p>
          </div>
          <Button 
            className="medical-gradient text-white gap-2 w-full sm:w-auto"
            onClick={() => navigate("/progress/log")}
          >
            <Plus className="h-4 w-4" />
            Log Weight
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            title="Current Weight"
            value={stats.currentWeight ? `${stats.currentWeight} kg` : "Not set"}
            icon={Weight}
            trend={stats.totalChange ? `${stats.totalChange < 0 ? '-' : '+'}${Math.abs(stats.totalChange).toFixed(1)} kg from start` : "Add weight"}
            trendUp={stats.totalChange < 0}
            color="primary"
          />
          <StatCard
            title="BMI"
            value={stats.bmi ? stats.bmi.toFixed(1) : "N/A"}
            icon={Activity}
            trend={stats.bmi ? bmiCategoryLabel(stats.bmi) : "Calculate BMI"}
            trendUp={stats.bmi >= 18.5 && stats.bmi < 25}
            color="success"
          />
          <StatCard
            title="Weekly Change"
            value={stats.weeklyChange ? `${Math.abs(stats.weeklyChange).toFixed(1)} kg` : "0 kg"}
            icon={stats.weeklyChange < 0 ? TrendingDown : TrendingUp}
            trend={stats.weeklyChange < 0 ? "Improvement" : stats.weeklyChange > 0 ? "Decline" : "Stable"}
            trendUp={stats.weeklyChange < 0}
            color="accent"
          />
          <StatCard
            title="Goal Progress"
            value={`${Math.round(stats.goalProgress)}%`}
            icon={TrendingUp}
            trend="On track"
            trendUp={true}
            color="secondary"
          />
        </div>

        {/* Progress Chart */}
        {weeklyData.length > 0 ? (
          <Card className="glass-card p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4 md:mb-6">Weight Progress</h2>
            
            <div className="space-y-6">
              {/* Simple bar chart visualization */}
              <div className="h-48 md:h-64 flex items-end justify-around gap-2 md:gap-4">
                {weeklyData.map((data, index) => {
                  const maxWeight = Math.max(...weeklyData.map(d => d.weight));
                  const height = (data.weight / maxWeight) * 100;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full flex items-end justify-center" style={{ height: '180px' }}>
                        <div 
                          className="w-full bg-gradient-to-t from-primary to-primary-glow rounded-t-lg smooth-transition hover:opacity-80 cursor-pointer"
                          style={{ height: `${height}%` }}
                        >
                          <div className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 text-xs md:text-sm font-bold text-foreground whitespace-nowrap">
                            {data.weight} kg
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs md:text-sm font-medium text-foreground">{data.week}</p>
                        <p className="text-xs text-muted-foreground">{data.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-6 border-t border-border">
                <div className="text-center">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Starting Weight</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.startWeight || 'N/A'} kg</p>
                </div>
                <div className="text-center">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Current Weight</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.currentWeight || 'N/A'} kg</p>
                </div>
                <div className="text-center">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Goal Weight</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.goalWeight || 'N/A'} kg</p>
                </div>
                <div className="text-center">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Change</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">
                    {stats.totalChange 
                      ? `${stats.totalChange < 0 ? '-' : '+'}${Math.abs(stats.totalChange).toFixed(1)} kg`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="glass-card p-8 md:p-12 text-center">
            <p className="text-muted-foreground mb-4">No progress data yet. Start logging your weight to track your journey!</p>
            <Button 
              className="medical-gradient text-white gap-2"
              onClick={() => navigate("/progress/log")}
            >
              <Plus className="h-4 w-4" />
              Log Your First Entry
            </Button>
          </Card>
        )}

        {/* Status Card */}
        {progressData.length > 0 && (
          <Card className="glass-card p-4 md:p-6 border-l-4 border-l-success">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-success to-green-500 shadow-lg flex-shrink-0">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
                  {stats.goalProgress > 50 ? 'Great Progress!' : 'Keep Going!'}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground mb-4">
                  {stats.goalProgress > 50 
                    ? `You're making excellent progress towards your goal. You've ${stats.totalChange < 0 ? 'lost' : 'gained'} ${Math.abs(stats.totalChange).toFixed(1)} kg, which is a healthy and sustainable rate. Keep up the good work!`
                    : `You've started your journey! Stay consistent with your diet plan and track your progress regularly.`}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" onClick={() => navigate("/diet-plans")} className="text-sm md:text-base">
                    View Diet Plan
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/recipes")} className="text-sm md:text-base">
                    Browse Recipes
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Weekly Log */}
        {progressData.length > 0 && (
          <Card className="glass-card p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4 md:mb-6">Recent Logs</h2>
            <div className="space-y-3">
              {progressData.slice(0, 10).map((data, index) => {
                const date = data.date?.toDate?.() || new Date(data.date);
                const formattedDate = date.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                });
                const previousWeight = progressData[index + 1]?.weight;
                const change = previousWeight ? data.weight - previousWeight : null;

                return (
                  <div key={data.id || index}>
                    <div className="flex items-center justify-between p-3 md:p-4 border border-border rounded-lg hover:bg-muted/50 smooth-transition group">
                    <div className="flex items-center gap-3 md:gap-4 flex-1">
                      <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm md:text-base text-foreground">{formattedDate}</p>
                        {data.notes && (
                          <p className="text-xs md:text-sm text-muted-foreground">{data.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-base md:text-xl font-bold text-foreground">{data.weight} kg</p>
                        {change !== null && (
                          <p className={`text-xs md:text-sm ${change < 0 ? 'text-success' : change > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {change < 0 ? '-' : change > 0 ? '+' : ''}{Math.abs(change).toFixed(1)} kg
                          </p>
                        )}
                      </div>
                      {data.aiAnalysis && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => setExpandedAnalysis(expandedAnalysis === data.id ? null : data.id)}
                          title="View AI Analysis"
                        >
                          {expandedAnalysis === data.id ? <ChevronUp className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                        </Button>
                      )}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => handleEditEntry(data)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteEntry(data.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Expandable AI Analysis */}
                  {data.aiAnalysis && expandedAnalysis === data.id && (
                    <div className="mt-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">AI Progress Analysis</span>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                        {data.aiAnalysis}
                      </div>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Progress;
