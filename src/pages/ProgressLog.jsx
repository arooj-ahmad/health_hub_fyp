import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Save, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { logProgress, updateProgressLog, getUserProfile, getUserProgress, updateUserWeight } from "@/services/firestoreService";
import { generateAIResponse } from "@/services/aiService";
import { Timestamp } from "firebase/firestore";
import LoadingSpinner from "@/components/LoadingSpinner";

// ── Helper calculations (same as CreateDietPlan) ────────────────────────────

function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const hm = heightCm / 100;
  return parseFloat((weightKg / (hm * hm)).toFixed(1));
}

function bmiCategory(bmi) {
  if (bmi == null) return "";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function autoGoal(cat) {
  if (cat === "Underweight") return "Weight Gain";
  if (cat === "Normal") return "Maintenance";
  return "Weight Loss";
}

function healthyTargetWeight(heightCm, cat) {
  if (!heightCm) return null;
  const hm = heightCm / 100;
  if (cat === "Underweight") return parseFloat((18.5 * hm * hm).toFixed(1));
  if (cat === "Normal") return null;
  return parseFloat((24.9 * hm * hm).toFixed(1));
}

function calcDailyCalories(weightKg, heightCm, age, gender, activityLevel, goal) {
  if (!weightKg || !heightCm || !age) return null;
  let bmr;
  if (gender === "female") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  const multiplier = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, "very-active": 1.9 };
  const tdee = bmr * (multiplier[activityLevel] || 1.2);
  if (goal === "Weight Loss") return Math.round(tdee - 500);
  if (goal === "Weight Gain") return Math.round(tdee + 400);
  return Math.round(tdee);
}

// ── Component ────────────────────────────────────────────────────────────────

const ProgressLog = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalysing, setIsAnalysing] = useState(false);

  // Check if we're editing an existing entry
  const editEntry = location.state?.editEntry;
  const isEditMode = !!editEntry;

  const [logData, setLogData] = useState({
    weight: "",
    date: new Date().toISOString().split("T")[0],
    bloodPressure: "",
    mood: "",
    notes: "",
  });

  // Pre-fill data if editing
  useEffect(() => {
    if (editEntry) {
      const entryDate = editEntry.date?.toDate?.() || new Date(editEntry.date);
      setLogData({
        weight: editEntry.weight?.toString() || "",
        date: entryDate.toISOString().split("T")[0],
        bloodPressure: editEntry.bloodPressure || "",
        mood: editEntry.mood || "",
        notes: editEntry.notes || "",
      });
    }
  }, [editEntry]);

  // ── Submit weight & run AI analysis ──────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast({ title: "Authentication required", description: "Please log in to log your progress", variant: "destructive" });
      return;
    }

    const weight = parseFloat(logData.weight);
    if (isNaN(weight) || weight <= 0) {
      toast({ title: "Invalid Weight", description: "Please enter a valid weight value", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setAiAnalysis(null);

    try {
      // 1. Save/update the progress entry first
      const progressEntry = {
        weight,
        date: Timestamp.fromDate(new Date(logData.date)),
        bloodPressure: logData.bloodPressure.trim() || null,
        mood: logData.mood.trim() || null,
        notes: logData.notes.trim() || null,
      };

      if (isEditMode && editEntry.id) {
        await updateProgressLog(editEntry.id, progressEntry);
        toast({ title: "Progress Updated!", description: "Your health data has been updated." });
      } else {
        await logProgress(user.uid, progressEntry);
        toast({ title: "Progress Logged!", description: "Your weight has been recorded." });
      }

      // Update the user's current weight in the users collection
      await updateUserWeight(user.uid, weight);

      // 2. Fetch profile + full history for AI analysis
      setIsAnalysing(true);

      const [profile, progressHistory] = await Promise.all([
        getUserProfile(user.uid),
        getUserProgress(user.uid, 50),
      ]);

      const hp = profile?.healthProfile || {};
      const heightCm = hp.height;
      const age = hp.age;
      const gender = hp.gender || "male";
      const activityLevel = hp.activityLevel || "sedentary";

      if (!heightCm) {
        toast({ title: "Profile incomplete", description: "Please set up your height in Profile to get AI analysis.", variant: "destructive" });
        setIsAnalysing(false);
        setIsSubmitting(false);
        navigate("/progress");
        return;
      }

      // Sort history oldest → newest
      const sorted = [...progressHistory].sort((a, b) => {
        const da = a.date?.toDate?.() || new Date(a.date);
        const db = b.date?.toDate?.() || new Date(b.date);
        return da - db;
      });

      const startingWeight = sorted.length > 0 ? parseFloat(sorted[0].weight) : weight;
      const currentWeight = weight;
      const previousWeight = sorted.length >= 2 ? parseFloat(sorted[sorted.length - 2].weight) : startingWeight;

      // Compute system values
      const currentBMI = calcBMI(currentWeight, heightCm);
      const cat = bmiCategory(currentBMI);
      const goal = autoGoal(cat);
      const targetWeight = healthyTargetWeight(heightCm, cat) || currentWeight;
      const calories = calcDailyCalories(currentWeight, heightCm, age, gender, activityLevel, goal);

      // 3. Build AI prompt
      const prompt = `You are an advanced AI Progress Analysis Assistant for SmartNutrition Pakistan.

The user is logging their weekly weight.

The system has already:
- Calculated BMI from height and weight
- Determined BMI category
- Selected goal automatically (Weight Loss / Weight Gain / Maintenance)
- Calculated target healthy weight (BMI normal range)
- Calculated daily calorie target
- Generated a diet plan earlier

The user does NOT decide the goal.
The system determines everything.
You must NOT change the goal or target weight unless goal conditions are met.

--------------------------------------------------

USER PROFILE:

Height: ${heightCm} cm
Starting Weight: ${startingWeight} kg
Current Weight: ${currentWeight} kg
Previous Week Weight: ${previousWeight} kg
Calculated BMI (Current): ${currentBMI}
BMI Category: ${cat}
System Goal: ${goal}
Target Healthy Weight: ${targetWeight} kg
Daily Calorie Target: ${calories} kcal

--------------------------------------------------

YOUR TASK:

==============================
STEP 1 — Calculate Progress
==============================

1) Calculate weekly weight change:
   Current Weight - Previous Weight = ${(currentWeight - previousWeight).toFixed(1)} kg

2) Calculate total weight change:
   Current Weight - Starting Weight = ${(currentWeight - startingWeight).toFixed(1)} kg

3) Calculate remaining weight to reach target:
   Current Weight - Target Healthy Weight = ${(currentWeight - targetWeight).toFixed(1)} kg

==============================
STEP 2 — Evaluate Progress Based on Goal
==============================

If Goal = Weight Loss:
- Healthy loss: 0.5 – 1 kg per week
- Slow progress: less than 0.3 kg per week
- Too fast: more than 1.5 kg per week
- Weight gain: if weight increased

If Goal = Weight Gain:
- Healthy gain: 0.25 – 0.5 kg per week
- Too fast gain: above 1 kg per week

If Goal = Maintenance:
- Acceptable change: ±0.5 kg

==============================
STEP 3 — Generate Smart Feedback
==============================

1) Clearly explain current progress status:
   - Healthy
   - Slow
   - Too Fast
   - Plateau
   - Moving in Wrong Direction

2) Provide simple, motivational feedback.

3) If progress is unhealthy, suggest:
   - Slight calorie adjustment (±100–200 kcal)
   - Increase or decrease physical activity
   - Improve protein or fiber intake

4) If current weight has reached or passed target weight:
   - Congratulate user
   - Recommend switching to Maintenance phase
   - Suggest stable calorie level

==============================
STEP 4 — Provide Additional Insights
==============================

Include:
- Updated BMI status
- Estimated weeks to reach target (if progress consistent)
- Encourage consistency
- Mention that small fluctuations are normal

--------------------------------------------------

Use simple and clear English.
Be encouraging but medically responsible.
Do NOT shame the user.
Do NOT give medical diagnosis.
Do NOT give extreme dieting advice.

--------------------------------------------------

End with this disclaimer:

"This progress analysis is for informational purposes only and does not replace professional medical advice."`;

      const aiResponse = await generateAIResponse(prompt);
      setAiAnalysis(aiResponse);

      // Also store the AI analysis on the latest progress log
      if (!isEditMode && sorted.length > 0) {
        const latestLogId = sorted[sorted.length - 1]?.id;
        if (latestLogId) {
          try {
            await updateProgressLog(latestLogId, { aiAnalysis: aiResponse });
          } catch (_) {
            // non-critical – UI already shows the analysis
          }
        }
      }
    } catch (error) {
      console.error("Error saving progress:", error);
      toast({ title: "Error", description: "Failed to save progress. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsAnalysing(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/progress")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Progress
        </Button>

        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {isEditMode ? "Edit Progress Entry" : "Log Your Progress"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isEditMode ? "Update your health metrics" : "Record your weekly weight — AI will analyse your progress"}
          </p>
        </div>

        {/* ── Weight Form ──────────────────────────────────────────── */}
        <Card className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={logData.date}
                  onChange={(e) => setLogData({ ...logData, date: e.target.value })}
                  className="glass-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="72.5"
                  value={logData.weight}
                  onChange={(e) => setLogData({ ...logData, weight: e.target.value })}
                  className="glass-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodPressure">Blood Pressure (optional)</Label>
                <Input
                  id="bloodPressure"
                  placeholder="120/80"
                  value={logData.bloodPressure}
                  onChange={(e) => setLogData({ ...logData, bloodPressure: e.target.value })}
                  className="glass-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mood">Mood / Energy Level (optional)</Label>
                <Input
                  id="mood"
                  placeholder="Good, Tired, Energetic, etc."
                  value={logData.mood}
                  onChange={(e) => setLogData({ ...logData, mood: e.target.value })}
                  className="glass-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any observations, feelings, or notes about your progress..."
                value={logData.notes}
                onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
                className="glass-input min-h-[100px]"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1 medical-gradient text-white gap-2"
                disabled={isSubmitting || isAnalysing}
              >
                {isSubmitting || isAnalysing ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    {isAnalysing ? "Analysing with AI..." : isEditMode ? "Updating..." : "Saving..."}
                  </span>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditMode ? "Update & Analyse" : "Save & Analyse"}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/progress")} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>

        {/* ── AI Progress Analysis ─────────────────────────────────── */}
        {isAnalysing && !aiAnalysis && (
          <Card className="glass-card p-8 text-center">
            <LoadingSpinner />
            <p className="text-muted-foreground mt-4">Generating AI progress analysis…</p>
          </Card>
        )}

        {aiAnalysis && (
          <Card className="glass-card p-6 md:p-8 border-l-4 border-l-primary">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">AI Progress Analysis</h3>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {aiAnalysis}
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => navigate("/progress")}>
                View All Progress
              </Button>
              <Button variant="outline" onClick={() => navigate("/diet-plans")}>
                View Diet Plans
              </Button>
            </div>
          </Card>
        )}

        {/* ── Tips ─────────────────────────────────────────────────── */}
        {!aiAnalysis && (
          <Card className="glass-card p-6 border-l-4 border-l-accent">
            <h3 className="font-semibold text-foreground mb-2">Tracking Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Weigh yourself at the same time each day for consistency</li>
              <li>• Morning weight (after bathroom, before eating) is most accurate</li>
              <li>• Don't worry about daily fluctuations — focus on weekly trends</li>
              <li>• Log your blood pressure if you're monitoring heart health</li>
            </ul>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProgressLog;
