import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProfileSetup from "./pages/ProfileSetup";
import Dashboard from "./pages/Dashboard";
import { RecipeGeneratorPage } from "./modules/recipe";
import { DietPlannerPage, DietPlanDetailPage } from "./modules/diet";
import { RecipeHistoryPage, DietHistoryPage } from "./modules/history";
import Progress from "./pages/Progress";
import ProgressLog from "./pages/ProgressLog";
import LabReports from "./pages/LabReports";
import LabReportUpload from "./pages/LabReportUpload";
import LabReportDetail from "./pages/LabReportDetail";
import AIDoctor from "./pages/AIDoctor";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import NotFound from "./pages/NotFound";
import NutritionistProfileSetup from "./pages/NutritionistProfileSetup";
import NutritionistDashboard from "./pages/NutritionistDashboard";
import ConsultNutritionist from "./pages/ConsultNutritionist";
import NutritionistDetail from "./pages/NutritionistDetail";
import ConsultationChatPage from "./pages/ConsultationChatPage";
import MyAppointmentsPage from "./pages/MyAppointmentsPage";
import DietPlanDetails from "./pages/DietPlanDetails";
import { AuthProvider } from "./context/AuthContext";
import { UserRoute, NutritionistRoute, ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* User-only routes */}
              <Route path="/profile-setup" element={<UserRoute><ProfileSetup /></UserRoute>} />
              <Route path="/dashboard" element={<UserRoute><Dashboard /></UserRoute>} />
              <Route path="/recipes" element={<UserRoute><RecipeGeneratorPage /></UserRoute>} />
              <Route path="/diet-plans" element={<UserRoute><DietPlannerPage /></UserRoute>} />
              <Route path="/diet-plans/:id" element={<UserRoute><DietPlanDetailPage /></UserRoute>} />
              <Route path="/recipes/history" element={<UserRoute><RecipeHistoryPage /></UserRoute>} />
              <Route path="/diet/history" element={<UserRoute><DietHistoryPage /></UserRoute>} />
              <Route path="/diet-plan/:planId" element={<UserRoute><DietPlanDetails /></UserRoute>} />
              <Route path="/progress" element={<UserRoute><Progress /></UserRoute>} />
              <Route path="/progress/log" element={<UserRoute><ProgressLog /></UserRoute>} />
              <Route path="/lab-reports" element={<UserRoute><LabReports /></UserRoute>} />
              <Route path="/lab-reports/upload" element={<UserRoute><LabReportUpload /></UserRoute>} />
              <Route path="/lab-reports/:id" element={<UserRoute><LabReportDetail /></UserRoute>} />
              <Route path="/ai-doctor" element={<UserRoute><AIDoctor /></UserRoute>} />
              <Route path="/profile" element={<UserRoute><Profile /></UserRoute>} />
              <Route path="/profile/edit" element={<UserRoute><ProfileEdit /></UserRoute>} />
              <Route path="/consult-nutritionist" element={<UserRoute><ConsultNutritionist /></UserRoute>} />
              <Route path="/nutritionist/:id" element={<UserRoute><NutritionistDetail /></UserRoute>} />
              <Route path="/consultation/:nutritionistId" element={<UserRoute><ConsultationChatPage /></UserRoute>} />
              <Route path="/my-appointments" element={<UserRoute><MyAppointmentsPage /></UserRoute>} />

              {/* Nutritionist-only routes */}
              <Route path="/nutritionist/setup-profile" element={<NutritionistRoute><NutritionistProfileSetup /></NutritionistRoute>} />
              <Route path="/nutritionist/dashboard" element={<NutritionistRoute><NutritionistDashboard /></NutritionistRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
