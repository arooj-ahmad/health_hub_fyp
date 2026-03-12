import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, FlaskConical, Camera, Trash2,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { getDocument, deleteLabReport } from "@/services/firestoreService";
import { useAuth } from "@/context/AuthContext";

// ── New advanced lab-report result component ─────────────────────────────────
import { LabReportResult } from "@/modules/labReport";

// ── Helpers ──────────────────────────────────────────────────────────────────

const riskBadge = (level) => {
  if (level === "high") return <Badge className="bg-destructive text-white">High Risk</Badge>;
  if (level === "medium") return <Badge className="bg-warning text-white">Medium</Badge>;
  return <Badge className="bg-success text-white">Low Risk</Badge>;
};

const formatDate = (d) => {
  if (!d) return "—";
  if (d.toDate) return d.toDate().toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
  return new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
};

// ── Component ────────────────────────────────────────────────────────────────

const LabReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getDocument("labReports", id);
        if (!data) { toast({ title: "Not found", description: "Report not found", variant: "destructive" }); navigate("/lab-reports"); return; }
        setReport(data);
      } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Could not load report", variant: "destructive" });
      } finally { setLoading(false); }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this report?")) return;
    setDeleting(true);
    try {
      await deleteLabReport(id);
      toast({ title: "Deleted" });
      navigate("/lab-reports");
    } catch (e) {
      toast({ title: "Error", description: "Could not delete", variant: "destructive" });
    } finally { setDeleting(false); }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><LoadingSpinner /></div></DashboardLayout>;
  if (!report) return <DashboardLayout><p className="text-center py-20 text-muted-foreground">Report not found.</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/lab-reports")}>
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">{report.testName || "Lab Report"}</h1>
            <p className="text-muted-foreground">{formatDate(report.testDate)}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="gap-1">
              {report.labMode === "PDF" ? <Camera className="h-3 w-3" /> : <FlaskConical className="h-3 w-3" />}
              {report.labMode === "PDF" ? "Image Upload" : "Manual Entry"}
            </Badge>
            {riskBadge(report.riskLevel)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content — New advanced LabReportResult component */}
          <div className="lg:col-span-2">
            <LabReportResult report={report} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="glass-card p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Report Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-0.5">Test Name</p>
                  <p className="font-medium text-foreground">{report.testName || "—"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground mb-0.5">Test Date</p>
                  <p className="font-medium text-foreground">{formatDate(report.testDate)}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground mb-0.5">Input Mode</p>
                  <p className="font-medium text-foreground">{report.labMode === "PDF" ? "Image / PDF Upload" : "Manual Entry"}</p>
                </div>
                {report.fileName && report.labMode === "PDF" && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground mb-0.5">File</p>
                      <p className="font-medium text-foreground truncate">{report.fileName}</p>
                    </div>
                  </>
                )}
                {report.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground mb-0.5">Notes</p>
                      <p className="text-foreground">{report.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Actions</h3>
              <div className="space-y-3">
                <Button className="w-full medical-gradient text-white" onClick={() => navigate("/recipes")}>
                  View Recommended Recipes
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate("/diet-plans/create")}>
                  Create Diet Plan
                </Button>
                <Button variant="outline" className="w-full text-destructive hover:text-destructive gap-2" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <LoadingSpinner size="sm" /> : <><Trash2 className="h-4 w-4" /> Delete Report</>}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LabReportDetail;
