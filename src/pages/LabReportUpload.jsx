import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { createLabReport, getUserProfile } from "@/services/firestoreService";
import { Timestamp } from "firebase/firestore";

// ── New advanced lab-report module ───────────────────────────────────────────
import {
  LabInputSelector,
  ManualLabForm,
  PdfUpload,
  analyzeLabReport,
  extractPdfText,
  computeSystemValues,
  formatManualLabValues,
} from "@/modules/labReport";

// ── Component ────────────────────────────────────────────────────────────────

const LabReportUpload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [labMode, setLabMode] = useState("MANUAL"); // "MANUAL" | "PDF"
  const [file, setFile] = useState(null);
  const [profileData, setProfileData] = useState(null);

  // Manual lab values
  const [labValues, setLabValues] = useState({
    fastingSugar: "", randomSugar: "", hba1c: "",
    totalCholesterol: "", ldl: "", hdl: "", triglycerides: "",
    hemoglobin: "", vitaminD: "", uricAcid: "",
    creatinine: "", tsh: "", bloodPressure: "",
  });

  const [meta, setMeta] = useState({ testName: "", testDate: new Date().toISOString().split("T")[0], notes: "" });

  // Load health profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const p = await getUserProfile(user.uid);
        setProfileData(p?.healthProfile || null);
      } catch (e) { console.warn("Could not load profile", e); }
    })();
  }, [user]);

  // Computed system values (from the new module)
  const sys = useMemo(() => computeSystemValues(profileData), [profileData]);

  // Check if manual values have any data
  const hasManualValues = Object.values(labValues).some((v) => v.toString().trim());

  // ── Submit & Analyse ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { toast({ title: "Auth required", description: "Please log in", variant: "destructive" }); return; }
    if (!profileData) { toast({ title: "Profile missing", description: "Complete your health profile first.", variant: "destructive" }); return; }
    if (labMode === "PDF" && !file) { toast({ title: "No file", description: "Please upload a lab report image.", variant: "destructive" }); return; }
    if (labMode === "MANUAL" && !hasManualValues) { toast({ title: "No values", description: "Enter at least one lab value.", variant: "destructive" }); return; }

    setIsAnalyzing(true);

    try {
      // Extract PDF text if applicable
      let pdfText = "";
      if (labMode === "PDF" && file) {
        pdfText = await extractPdfText(file);
      }

      // Call the advanced AI analyzer from the new module
      const { aiResponse, riskLevel, sys: computedSys } = await analyzeLabReport({
        labMode,
        labValues,
        pdfText,
        file,
        healthProfile: profileData,
      });

      const { bmi, cat, goal, cal } = computedSys;

      // Save to Firestore (labReports collection)
      const reportDoc = await createLabReport(user.uid, {
        testName: meta.testName || (labMode === "PDF" ? "Lab Report (Image)" : "Manual Lab Entry"),
        testDate: Timestamp.fromDate(new Date(meta.testDate)),
        notes: meta.notes,
        labMode,
        fileName: file?.name || "Manual entry",
        fileType: file?.type || "manual",
        manualValues: labMode === "MANUAL" ? labValues : null,
        pdfText: pdfText || null,
        aiAnalysis: aiResponse,
        riskLevel,
        bmi,
        bmiCategory: cat,
        goal,
        targetCalories: cal,
        findings: aiResponse.substring(0, 200) + "...",
        status: "reviewed",
      });

      toast({ title: "Lab Report Analysed!", description: "Your report has been processed with AI food recommendations." });
      navigate(`/lab-reports/${reportDoc.id}`);
    } catch (error) {
      console.error("Lab report analysis error:", error);
      toast({ title: "Analysis Error", description: "Failed to analyse report. Please try again.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/lab-reports")}>
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Button>

        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Upload Lab Report</h1>
          <p className="text-muted-foreground text-lg">Choose PDF/Image upload or enter values manually</p>
        </div>

        {/* Profile summary */}
        {profileData && sys.bmi && (
          <Card className="glass-card p-4 border-l-4 border-l-primary">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Health Profile Loaded</p>
                <p className="text-xs text-muted-foreground">BMI {sys.bmi} ({sys.cat}) · Goal: {sys.goal} · Target: {sys.cal} kcal/day · Allergies: {sys.allergies}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Mode Tabs — using new LabInputSelector */}
        <Tabs value={labMode} onValueChange={setLabMode} className="w-full">
          <LabInputSelector labMode={labMode} onModeChange={setLabMode} />

          {/* ── PDF / Image Tab ─────────────────────────────────── */}
          <TabsContent value="PDF">
            <Card className="glass-card p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <PdfUpload file={file} onFileChange={setFile} />

                {/* Optional metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Test Name (optional)</Label>
                    <Input placeholder="e.g., Complete Blood Count" value={meta.testName} onChange={(e) => setMeta({ ...meta, testName: e.target.value })} className="glass-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Test Date</Label>
                    <Input type="date" value={meta.testDate} onChange={(e) => setMeta({ ...meta, testDate: e.target.value })} className="glass-input" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea placeholder="Any symptoms or concerns..." value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} className="glass-input min-h-[80px]" />
                </div>

                <Button type="submit" className="w-full h-12 medical-gradient text-white gap-2" disabled={!file || isAnalyzing || !profileData}>
                  {isAnalyzing ? <LoadingSpinner size="sm" /> : <><Sparkles className="h-5 w-5" /> Analyse Report with AI</>}
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* ── Manual Entry Tab — using new ManualLabForm ───────── */}
          <TabsContent value="MANUAL">
            <Card className="glass-card p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <ManualLabForm labValues={labValues} onChange={setLabValues} />

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Report Name (optional)</Label>
                    <Input placeholder="e.g., Monthly Checkup" value={meta.testName} onChange={(e) => setMeta({ ...meta, testName: e.target.value })} className="glass-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Test Date</Label>
                    <Input type="date" value={meta.testDate} onChange={(e) => setMeta({ ...meta, testDate: e.target.value })} className="glass-input" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea placeholder="Any symptoms or concerns..." value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} className="glass-input min-h-[80px]" />
                </div>

                <Button type="submit" className="w-full h-12 medical-gradient text-white gap-2" disabled={isAnalyzing || !profileData}>
                  {isAnalyzing ? <LoadingSpinner size="sm" /> : <><Sparkles className="h-5 w-5" /> Analyse Lab Values with AI</>}
                </Button>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info card */}
        <Card className="glass-card p-6">
          <h3 className="font-semibold text-foreground mb-3">What the AI will do</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Detect lab panels (diabetes, lipid, CBC, thyroid, kidney, etc.)</li>
            <li>• Compare values to reference ranges — flag abnormal ones</li>
            <li>• Detect risk phrases (prediabetic, borderline, high risk)</li>
            <li>• Recommend healthy foods, foods to limit, and foods to avoid</li>
            <li>• Suggest healthy Pakistani halal food alternatives</li>
            <li>• Provide lifestyle suggestions for Pakistani routine</li>
            <li>• End with a clear medical disclaimer</li>
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LabReportUpload;
