import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Calendar, AlertCircle, FlaskConical, Camera } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserLabReports } from "@/services/firestoreService";
import LoadingSpinner from "@/components/LoadingSpinner";

const LabReports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const userReports = await getUserLabReports(user.uid);
        setReports(userReports);
      } catch (error) {
        console.error('Error fetching lab reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const getRiskColor = (level) => {
    switch (level) {
      case "low":
        return "bg-success text-white";
      case "medium":
        return "bg-warning text-white";
      case "high":
        return "bg-destructive text-white";
      default:
        return "bg-muted";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Lab Reports</h1>
            <p className="text-muted-foreground text-base md:text-lg">Upload and analyze your medical reports with AI</p>
          </div>
          <Button 
            className="medical-gradient text-white gap-2 w-full sm:w-auto"
            onClick={() => navigate("/lab-reports/upload")}
          >
            <Upload className="h-4 w-4" />
            Upload Report
          </Button>
        </div>

        {/* Important Notice */}
        <Card className="glass-card p-4 md:p-6 border-l-4 border-l-accent">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-accent mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground mb-1 text-sm md:text-base">AI-Powered Analysis</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Our AI assistant analyzes your lab reports and provides personalized dietary recommendations. Always consult your healthcare provider for medical advice.
              </p>
            </div>
          </div>
        </Card>

        {/* Reports Grid */}
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4 md:mb-6">
            {reports.length > 0 ? 'Your Reports' : 'No Reports Yet'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {reports.map((report) => {
              const testDate = report.testDate?.toDate?.() || new Date(report.testDate);
              const formattedDate = testDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              });

              return (
                <Card 
                  key={report.id}
                  className="glass-card p-4 md:p-6 hover-lift smooth-transition cursor-pointer"
                  onClick={() => navigate(`/lab-reports/${report.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-lg">
                      <FileText className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <Badge className={getRiskColor(report.riskLevel || 'low')}>
                      {report.riskLevel === 'low' ? 'Normal' : report.riskLevel === 'medium' ? 'Caution' : 'Alert'}
                    </Badge>
                  </div>

                  <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">{report.testName || report.name}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mb-4">{report.findings || 'Analysis pending'}</p>

                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                    <span>{formattedDate}</span>
                    {report.labMode && (
                      <Badge variant="outline" className="ml-auto text-[10px] gap-1 px-1.5">
                        {report.labMode === "PDF" ? <Camera className="h-2.5 w-2.5" /> : <FlaskConical className="h-2.5 w-2.5" />}
                        {report.labMode === "PDF" ? "Image" : "Manual"}
                      </Badge>
                    )}
                  </div>

                  <Button variant="outline" className="w-full mt-4 text-sm md:text-base">
                    View Analysis
                  </Button>
                </Card>
              );
            })}

            {/* Upload New Card */}
            <Card 
              className="glass-card p-4 md:p-6 border-2 border-dashed border-primary/30 hover-lift smooth-transition cursor-pointer flex items-center justify-center min-h-[200px]"
              onClick={() => navigate("/lab-reports/upload")}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-xl bg-primary/10 mb-3 md:mb-4">
                  <Upload className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">Upload New Report</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Get AI-powered analysis and recommendations
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Features */}
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4 md:mb-6">What We Analyze</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card className="glass-card p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-foreground mb-3">Key Biomarkers Analyzed</h3>
              <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <li>• Blood glucose levels (Fasting, Random, HbA1c)</li>
                <li>• Cholesterol panel (LDL, HDL, Triglycerides)</li>
                <li>• Blood pressure indicators</li>
                <li>• Hemoglobin and Vitamin D levels</li>
                <li>• Kidney function (Creatinine) and Thyroid (TSH)</li>
                <li>• Uric Acid levels</li>
              </ul>
            </Card>

            <Card className="glass-card p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-foreground mb-3">AI Food Recommendations</h3>
              <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <li>• Recommended healthy foods based on lab markers</li>
                <li>• Foods to limit and foods to avoid</li>
                <li>• Healthy Pakistani halal food suggestions</li>
                <li>• Risk detection and health insights</li>
                <li>• Lifestyle modification suggestions</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LabReports;
