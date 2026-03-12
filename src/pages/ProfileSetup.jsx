import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile } from "@/services/firestoreService";
import LoadingSpinner from "@/components/LoadingSpinner";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const totalSteps = 3;
  
  const [profileData, setProfileData] = useState({
    // Step 1: Basic Info
    age: "",
    gender: "",
    height: "",
    weight: "",
    bloodType: "",
    
    // Step 2: Medical History
    bloodPressure: "",
    diabetes: "",
    heartConditions: "",
    allergies: "",
    medications: "",
    
    // Step 3: Lifestyle
    activityLevel: "",
    smokingStatus: "",
    alcoholConsumption: "",
    dietaryRestrictions: "",
    medicalHistory: "",
  });

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Complete profile setup
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to complete profile setup.",
          variant: "destructive"
        });
        return;
      }

      setIsSaving(true);
      try {
        // Calculate BMI
        const heightInMeters = parseFloat(profileData.height) / 100;
        const weightInKg = parseFloat(profileData.weight);
        const bmi = weightInKg / (heightInMeters * heightInMeters);

        // Save complete profile to Firestore
        await updateUserProfile(user.uid, {
          healthProfile: {
            // Basic Info
            age: parseInt(profileData.age),
            gender: profileData.gender,
            height: parseFloat(profileData.height),
            weight: parseFloat(profileData.weight),
            bloodType: profileData.bloodType,
            bmi: parseFloat(bmi.toFixed(1)),
            
            // Medical History
            bloodPressure: profileData.bloodPressure,
            diabetes: profileData.diabetes,
            heartConditions: profileData.heartConditions,
            allergies: profileData.allergies,
            medications: profileData.medications,
            
            // Lifestyle
            activityLevel: profileData.activityLevel,
            smokingStatus: profileData.smokingStatus,
            alcoholConsumption: profileData.alcoholConsumption,
            dietaryRestrictions: profileData.dietaryRestrictions,
            medicalHistory: profileData.medicalHistory
          },
          profileCompleted: true
        });

        toast({
          title: "Profile Created!",
          description: "Your health profile has been set up successfully.",
        });
        navigate("/dashboard");
      } catch (error) {
        console.error('Error saving profile:', error);
        toast({
          title: "Error",
          description: "Failed to save profile. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-light via-background to-accent-light">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Health Profile</h1>
          <p className="text-muted-foreground mb-4">Step {step} of {totalSteps}</p>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="glass-card p-8 shadow-xl">
          {step === 1 && (
            <div className="space-y-6 animate-slide-up">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
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
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="170"
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
                    placeholder="70"
                    value={profileData.weight}
                    onChange={(e) => setProfileData({ ...profileData, weight: e.target.value })}
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
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
          )}

          {step === 2 && (
            <div className="space-y-6 animate-slide-up">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Medical History</h2>
              
              <div className="grid grid-cols-1 gap-4">
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

                <div className="space-y-2">
                  <Label htmlFor="diabetes">Diabetes Status</Label>
                  <Select 
                    value={profileData.diabetes} 
                    onValueChange={(value) => setProfileData({ ...profileData, diabetes: value })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Select status" />
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
                    placeholder="None / specify conditions"
                    value={profileData.heartConditions}
                    onChange={(e) => setProfileData({ ...profileData, heartConditions: e.target.value })}
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    placeholder="List any allergies (food, medication, etc.)"
                    value={profileData.allergies}
                    onChange={(e) => setProfileData({ ...profileData, allergies: e.target.value })}
                    className="glass-input min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medications">Current Medications</Label>
                  <Textarea
                    id="medications"
                    placeholder="List any medications you're currently taking"
                    value={profileData.medications}
                    onChange={(e) => setProfileData({ ...profileData, medications: e.target.value })}
                    className="glass-input min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-slide-up">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Lifestyle Information</h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="activityLevel">Activity Level</Label>
                  <Select 
                    value={profileData.activityLevel} 
                    onValueChange={(value) => setProfileData({ ...profileData, activityLevel: value })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Select activity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                      <SelectItem value="light">Light (1-3 days/week)</SelectItem>
                      <SelectItem value="moderate">Moderate (3-5 days/week)</SelectItem>
                      <SelectItem value="active">Active (6-7 days/week)</SelectItem>
                      <SelectItem value="veryActive">Very Active (intense exercise)</SelectItem>
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
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="former">Former smoker</SelectItem>
                      <SelectItem value="current">Current smoker</SelectItem>
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
                      <SelectValue placeholder="Select frequency" />
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
                  <Textarea
                    id="dietaryRestrictions"
                    placeholder="Vegetarian, vegan, gluten-free, etc."
                    value={profileData.dietaryRestrictions}
                    onChange={(e) => setProfileData({ ...profileData, dietaryRestrictions: e.target.value })}
                    className="glass-input min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicalHistory">Additional Medical History</Label>
                  <Textarea
                    id="medicalHistory"
                    placeholder="Any other relevant medical history or notes"
                    value={profileData.medicalHistory}
                    onChange={(e) => setProfileData({ ...profileData, medicalHistory: e.target.value })}
                    className="glass-input min-h-[120px]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="medical-gradient text-white gap-2"
              disabled={isSaving}
            >
              {isSaving ? (
                <><LoadingSpinner size="sm" /> Saving...</>
              ) : (
                <>{step === totalSteps ? "Complete" : "Next"} <ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSetup;
