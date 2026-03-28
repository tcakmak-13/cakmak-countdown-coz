import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import InstallBanner from "@/components/InstallBanner";
import NotificationNavigator from "@/components/NotificationNavigator";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import SelectCoach from "./pages/SelectCoach";
import CoachOnboarding from "./pages/CoachOnboarding";
import StudentDashboard from "./pages/StudentDashboard";
import CoachDashboard from "./pages/CoachDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import FirmDashboard from "./pages/FirmDashboard";
import NotFound from "./pages/NotFound";
import Showcase from "./pages/Showcase";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <NotificationNavigator />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/select-coach" element={<ProtectedRoute><SelectCoach /></ProtectedRoute>} />
            <Route path="/coach-onboarding" element={<ProtectedRoute requiredRole="koc"><CoachOnboarding /></ProtectedRoute>} />
            <Route path="/student" element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/coach" element={<ProtectedRoute requiredRole="koc"><CoachDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="firm_admin"><FirmDashboard /></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/firm" element={<ProtectedRoute requiredRole="firm_admin"><FirmDashboard /></ProtectedRoute>} />
            <Route path="/showcase" element={<Showcase />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <InstallBanner />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;