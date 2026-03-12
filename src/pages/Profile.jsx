import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Edit, User, Heart, Activity, Calendar, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile } from "@/services/firestoreService";
import LoadingSpinner from "@/components/LoadingSpinner";

// BMI category helper
function getBmiCategory(bmi) {
  if (!bmi) return { label: "N/A", color: "bg-muted text-muted-foreground" };
  if (bmi < 18.5) return { label: "Underweight", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" };
  if (bmi < 25) return { label: "Normal", color: "bg-success text-white" };
  if (bmi < 30) return { label: "Overweight", color: "bg-warning text-white" };
  return { label: "Obese", color: "bg-destructive text-white" };
}

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const data = await getUserProfile(user.uid);
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  // Profile not found
  const hp = profile?.healthProfile;
  if (!profile || !hp) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Profile Not Found</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Your health profile has not been set up yet. Please complete the profile setup to see your information here.
          </p>
          <Button className="medical-gradient text-white gap-2" onClick={() => navigate("/profile-setup")}>
            Complete Profile Setup
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Derive display values from the real healthProfile data
  const displayName = profile.displayName || user?.displayName || user?.email?.split("@")[0] || "User";
  const email = profile.email || user?.email || "";
  const age = hp.age || "";
  const gender = hp.gender || "";
  const bloodType = hp.bloodType || "N/A";
  const height = hp.height;
  const weight = hp.weight;
  const bloodPressure = hp.bloodPressure || "N/A";

  // BMI — use stored value or recalculate
  let bmi = hp.bmi;
  if (!bmi && weight && height) {
    bmi = parseFloat((weight / ((height / 100) ** 2)).toFixed(1));
  }
  const bmiInfo = getBmiCategory(bmi);

  const diabetes = hp.diabetes || "None";
  const heartConditions = hp.heartConditions || "None";
  const allergies = hp.allergies || "None";
  const medications = hp.medications || "None";
  const medicalHistory = hp.medicalHistory || "None";

  const activityLevel = hp.activityLevel || "N/A";
  const smokingStatus = hp.smokingStatus || "N/A";
  const alcoholConsumption = hp.alcoholConsumption || "N/A";
  const dietaryRestrictions = hp.dietaryRestrictions || "None";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Health Profile</h1>
            <p className="text-muted-foreground text-lg">Your personal health information and medical history</p>
          </div>
          <Button 
            className="medical-gradient text-white gap-2"
            onClick={() => navigate("/profile/edit")}
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        {/* Profile Header Card */}
        <Card className="glass-card p-8">
          <div className="flex items-start gap-6">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
              <User className="h-12 w-12 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-foreground mb-2">{displayName}</h2>
              <p className="text-muted-foreground mb-4">{email}</p>
              <div className="flex flex-wrap gap-3">
                {age && (
                  <Badge variant="outline" className="text-sm">
                    {age} years
                  </Badge>
                )}
                {gender && (
                  <Badge variant="outline" className="text-sm">
                    {gender}
                  </Badge>
                )}
                <Badge variant="outline" className="text-sm">
                  Blood Type: {bloodType}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Physical Measurements */}
          <Card className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="h-6 w-6 text-primary" />
              <h3 className="text-2xl font-semibold text-foreground">Physical Measurements</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Height</p>
                <p className="text-xl font-semibold text-foreground">{height ? `${height} cm` : "N/A"}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Weight</p>
                <p className="text-xl font-semibold text-foreground">{weight ? `${weight} kg` : "N/A"}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">BMI</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-semibold text-foreground">{bmi || "N/A"}</p>
                  <Badge className={bmiInfo.color}>{bmiInfo.label}</Badge>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Blood Pressure</p>
                <p className="text-xl font-semibold text-foreground">{bloodPressure}</p>
              </div>
            </div>
          </Card>

          {/* Medical History */}
          <Card className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Heart className="h-6 w-6 text-destructive" />
              <h3 className="text-2xl font-semibold text-foreground">Medical History</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Diabetes Status</p>
                <Badge variant="outline" className={diabetes !== "None" ? "text-warning border-warning" : ""}>
                  {diabetes}
                </Badge>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Heart Conditions</p>
                <p className="text-foreground">{heartConditions}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Allergies</p>
                <p className="text-foreground">{allergies}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Medications</p>
                <p className="text-foreground">{medications}</p>
              </div>
              {medicalHistory !== "None" && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Other Medical History</p>
                    <p className="text-foreground">{medicalHistory}</p>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Lifestyle Information */}
          <Card className="glass-card p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="h-6 w-6 text-accent" />
              <h3 className="text-2xl font-semibold text-foreground">Lifestyle Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Activity Level</p>
                <p className="text-lg font-medium text-foreground">{activityLevel}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Smoking Status</p>
                <p className="text-lg font-medium text-foreground">{smokingStatus}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Alcohol Consumption</p>
                <p className="text-lg font-medium text-foreground">{alcoholConsumption}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Dietary Restrictions</p>
                <p className="text-lg font-medium text-foreground">{dietaryRestrictions}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <Card className="glass-card p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2 hover:bg-primary hover:text-white"
              onClick={() => navigate("/profile/edit")}
            >
              <Edit className="h-5 w-5" />
              <span>Edit Profile</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2 hover:bg-primary hover:text-white"
              onClick={() => navigate("/progress")}
            >
              <Activity className="h-5 w-5" />
              <span>View Progress</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2 hover:bg-primary hover:text-white"
              onClick={() => navigate("/lab-reports")}
            >
              <Heart className="h-5 w-5" />
              <span>Lab Reports</span>
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
