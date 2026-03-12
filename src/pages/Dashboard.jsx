import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Activity, Apple, Calendar, Heart, TrendingUp, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getUserStats, getUserProgress, getUserProfile, onUserProfileSnapshot } from "@/services/firestoreService";
import LoadingSpinner from "@/components/LoadingSpinner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeDietPlans: 0,
    totalRecipes: 0,
    totalLabReports: 0,
    recentProgress: []
  });
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    weight: null,
    bmi: null,
    caloriesGoal: 2100
  });

  // Real-time listener for user profile (weight, BMI update instantly)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onUserProfileSnapshot(user.uid, (profile) => {
      if (profile) {
        const weight = profile.currentWeight || profile.healthProfile?.weight;
        const height = profile.healthProfile?.height;
        // Prefer stored bmi (updated by updateUserWeight), fallback to healthProfile.BMI, then recalculate
        let bmi = profile.bmi || profile.healthProfile?.BMI;

        if (!bmi && weight && height) {
          bmi = parseFloat((weight / ((height / 100) ** 2)).toFixed(1));
        }

        setUserProfile({
          weight: weight || null,
          bmi: bmi ? parseFloat(bmi) : null,
          caloriesGoal: 2100
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // One-time fetch for stats and progress data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const [userStats, progressData] = await Promise.all([
          getUserStats(user.uid),
          getUserProgress(user.uid, 30)
        ]);
        
        setStats(userStats);
        
        // Calculate active days from progress data
        if (progressData && progressData.length > 0) {
          const activeDays = progressData.filter(p => {
            const date = p.date?.toDate?.() || new Date(p.date);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30;
          }).length;
          
          setStats(prev => ({ ...prev, activeDays }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const modules = [
    {
      title: "Recipe Recommendations",
      description: "Get personalized recipes based on your health profile",
      icon: UtensilsCrossed,
      color: "from-primary to-primary-glow",
      route: "/recipes"
    },
    {
      title: "Diet Plans",
      description: "Customized meal plans for your health goals",
      icon: Apple,
      color: "from-accent to-green-500",
      route: "/diet-plans"
    },
    {
      title: "Progress Tracking",
      description: "Monitor your health journey with detailed insights",
      icon: TrendingUp,
      color: "from-secondary to-blue-500",
      route: "/progress"
    },
    {
      title: "Lab Report Analysis",
      description: "Upload and analyze your medical reports",
      icon: Activity,
      color: "from-warning to-orange-500",
      route: "/lab-reports"
    },
    {
      title: "AI Doctor",
      description: "Get instant medical advice from our AI assistant",
      icon: Heart,
      color: "from-destructive to-red-500",
      route: "/ai-doctor"
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Welcome Back{user?.displayName && `, ${user.displayName}`}!</h1>
          <p className="text-muted-foreground text-base md:text-lg">Here's your health overview for today</p>
        </div>

        {/* Health Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            title="Current Weight"
            value={userProfile.weight ? `${userProfile.weight} kg` : "Not set"}
            icon={Activity}
            trend={userProfile.weight ? "Track progress" : "Add weight"}
            trendUp={false}
            color="primary"
          />
          <StatCard
            title="BMI"
            value={userProfile.bmi ? userProfile.bmi.toFixed(1) : "N/A"}
            icon={Heart}
            trend={userProfile.bmi ? "Normal range" : "Calculate BMI"}
            trendUp={true}
            color="success"
          />
          <StatCard
            title="Active Days"
            value={stats.activeDays || 0}
            icon={Calendar}
            trend="This month"
            trendUp={true}
            color="secondary"
          />
          <StatCard
            title="Calories Goal"
            value={userProfile.caloriesGoal || 2100}
            icon={Apple}
            trend="Per day"
            color="accent"
          />
        </div>

        {/* Modules Grid */}
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4 md:mb-6">Health Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {modules.map((module) => (
              <Card 
                key={module.title}
                className="glass-card p-4 md:p-6 hover-lift smooth-transition cursor-pointer group"
                onClick={() => navigate(module.route)}
              >
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 smooth-transition shadow-lg`}>
                  <module.icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">{module.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">{module.description}</p>
                <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white smooth-transition text-sm md:text-base">
                  Explore Module
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="glass-card p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <Button 
              className="h-auto py-3 md:py-4 flex flex-col items-center gap-2 bg-gradient-to-br from-primary to-primary-glow text-white hover:opacity-90 text-sm md:text-base"
              onClick={() => navigate("/recipes")}
            >
              <UtensilsCrossed className="h-5 w-5 md:h-6 md:w-6" />
              <span>Find Recipe</span>
            </Button>
            <Button 
              className="h-auto py-3 md:py-4 flex flex-col items-center gap-2 bg-gradient-to-br from-accent to-green-500 text-white hover:opacity-90 text-sm md:text-base"
              onClick={() => navigate("/diet-plans")}
            >
              <Apple className="h-5 w-5 md:h-6 md:w-6" />
              <span>Create Diet Plan</span>
            </Button>
            <Button 
              className="h-auto py-3 md:py-4 flex flex-col items-center gap-2 bg-gradient-to-br from-secondary to-blue-500 text-white hover:opacity-90 text-sm md:text-base"
              onClick={() => navigate("/progress/log")}
            >
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
              <span>Log Progress</span>
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
