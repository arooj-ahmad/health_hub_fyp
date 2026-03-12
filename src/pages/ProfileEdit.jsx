import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile, updateUserProfile } from "@/services/firestoreService";
import LoadingSpinner from "@/components/LoadingSpinner";

// Empty form state — used only as a shape reference, never displayed as "real" data
const EMPTY_FORM = {
  name: "",
  email: "",
  age: "",
  gender: "",
  bloodType: "",
  height: "",
  weight: "",
  bloodPressure: "",
  diabetes: "none",
  heartConditions: "",
  allergies: "",
  medications: "",
  medicalHistory: "",
  activityLevel: "sedentary",
  smokingStatus: "never",
  alcoholConsumption: "none",
  dietaryRestrictions: "",
};

const ProfileEdit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [profileData, setProfileData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // ── Fetch the real user profile on mount ─────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const data = await getUserProfile(user.uid);
        if (data) {
          const hp = data.healthProfile || {};
          setProfileData({
            name: data.displayName || user.displayName || user.email?.split("@")[0] || "",
            email: data.email || user.email || "",
            age: hp.age?.toString() || "",
            gender: hp.gender || "",
            bloodType: hp.bloodType || "",
            height: hp.height?.toString() || "",
            weight: hp.weight?.toString() || "",
            bloodPressure: hp.bloodPressure || "",
            diabetes: hp.diabetes || "none",
            heartConditions: hp.heartConditions || "",
            allergies: hp.allergies || "",
            medications: hp.medications || "",
            medicalHistory: hp.medicalHistory || "",
            activityLevel: hp.activityLevel || "sedentary",
            smokingStatus: hp.smokingStatus || "never",
            alcoholConsumption: hp.alcoholConsumption || "none",
            dietaryRestrictions: hp.dietaryRestrictions || "",
          });
        } else {
          // No profile doc yet — populate what we know from auth
          setProfileData((prev) => ({
            ...prev,
            name: user.displayName || user.email?.split("@")[0] || "",
            email: user.email || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching profile for edit:", error);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // ── Save changes to Firestore ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // Compute BMI from weight & height so it's persisted for the Dashboard
      const w = parseFloat(profileData.weight);
      const h = parseFloat(profileData.height);
      const bmi = w && h && h > 0 ? parseFloat((w / ((h / 100) ** 2)).toFixed(1)) : null;

      await updateUserProfile(user.uid, {
        displayName: profileData.name,
        email: profileData.email,
        healthProfile: {
          age: profileData.age ? parseInt(profileData.age, 10) : null,
          gender: profileData.gender,
          bloodType: profileData.bloodType,
          height: h || null,
          weight: w || null,
          BMI: bmi,
          bmi,
          bloodPressure: profileData.bloodPressure,
          diabetes: profileData.diabetes,
          heartConditions: profileData.heartConditions,
          allergies: profileData.allergies,
          medications: profileData.medications,
          medicalHistory: profileData.medicalHistory,
          activityLevel: profileData.activityLevel,
          smokingStatus: profileData.smokingStatus,
          alcoholConsumption: profileData.alcoholConsumption,
          dietaryRestrictions: profileData.dietaryRestrictions,
        },
      });

      toast({
        title: "Profile Updated!",
        description: "Your health profile has been saved successfully.",
      });
      navigate("/profile");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Save Failed",
        description: "Could not update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  // ── Not logged in / fetch error ──────────────────────────────────────────
  if (!user || fetchError) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {fetchError ? "Failed to Load Profile" : "Not Logged In"}
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            {fetchError
              ? "We couldn't load your profile data. Please try again later."
              : "Please log in to edit your profile."}
          </p>
          <Button
            className="medical-gradient text-white"
            onClick={() => navigate(fetchError ? "/profile" : "/login")}
          >
            {fetchError ? "Back to Profile" : "Go to Login"}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <Button 
          variant="ghost" 
          className="gap-2"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Button>

        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Edit Health Profile</h1>
          <p className="text-muted-foreground text-lg">Update your personal and medical information</p>
        </div>

        <Card className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="glass-input opacity-60 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={profileData.age}
                    onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select 
                    value={profileData.gender} 
                    onValueChange={(value) => setProfileData({ ...profileData, gender: value })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bloodType">Blood Type</Label>
                  <Select 
                    value={profileData.bloodType} 
                    onValueChange={(value) => setProfileData({ ...profileData, bloodType: value })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Physical Measurements */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Physical Measurements</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={profileData.height}
                    onChange={(e) => setProfileData({ ...profileData, height: e.target.value })}
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={profileData.weight}
                    onChange={(e) => setProfileData({ ...profileData, weight: e.target.value })}
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bloodPressure">Blood Pressure</Label>
                  <Input
                    id="bloodPressure"
                    placeholder="120/80"
                    value={profileData.bloodPressure}
                    onChange={(e) => setProfileData({ ...profileData, bloodPressure: e.target.value })}
                    className="glass-input"
                  />
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Medical History</h2>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="diabetes">Diabetes Status</Label>
                  <Select 
                    value={profileData.diabetes} 
                    onValueChange={(value) => setProfileData({ ...profileData, diabetes: value })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="type1">Type 1</SelectItem>
                      <SelectItem value="type2">Type 2</SelectItem>
                      <SelectItem value="prediabetic">Pre-diabetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heartConditions">Heart Conditions</Label>
                  <Input
                    id="heartConditions"
                    value={profileData.heartConditions}
                    onChange={(e) => setProfileData({ ...profileData, heartConditions: e.target.value })}
                    placeholder="e.g., None"
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicalHistory">Medical History</Label>
                  <Textarea
                    id="medicalHistory"
                    value={profileData.medicalHistory}
                    onChange={(e) => setProfileData({ ...profileData, medicalHistory: e.target.value })}
                    placeholder="Any relevant medical history..."
                    className="glass-input min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    value={profileData.allergies}
                    onChange={(e) => setProfileData({ ...profileData, allergies: e.target.value })}
                    placeholder="e.g., Peanuts, Shellfish"
                    className="glass-input min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medications">Current Medications</Label>
                  <Textarea
                    id="medications"
                    value={profileData.medications}
                    onChange={(e) => setProfileData({ ...profileData, medications: e.target.value })}
                    placeholder="e.g., Metformin 500mg"
                    className="glass-input min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            {/* Lifestyle */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Lifestyle Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="activityLevel">Activity Level</Label>
                  <Select 
                    value={profileData.activityLevel} 
                    onValueChange={(value) => setProfileData({ ...profileData, activityLevel: value })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="very-active">Very Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smokingStatus">Smoking Status</Label>
                  <Select 
                    value={profileData.smokingStatus} 
                    onValueChange={(value) => setProfileData({ ...profileData, smokingStatus: value })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="former">Former</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alcoholConsumption">Alcohol Consumption</Label>
                  <Select 
                    value={profileData.alcoholConsumption} 
                    onValueChange={(value) => setProfileData({ ...profileData, alcoholConsumption: value })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="occasional">Occasional</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="frequent">Frequent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                  <Input
                    id="dietaryRestrictions"
                    value={profileData.dietaryRestrictions}
                    onChange={(e) => setProfileData({ ...profileData, dietaryRestrictions: e.target.value })}
                    placeholder="e.g., Vegetarian, Halal"
                    className="glass-input"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button 
                type="submit"
                className="flex-1 medical-gradient text-white gap-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={() => navigate("/profile")}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfileEdit;
