import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUserManagement from "@/pages/admin/AdminUserManagement";
import AdminStructure from "@/pages/admin/AdminStructure";
import FacultyDashboard from "@/pages/faculty/FacultyDashboard";
import FacultyCredentials from "@/pages/faculty/FacultyCredentials";
import FacultyMarks from "@/pages/faculty/FacultyMarks";
import FacultyAttendance from "@/pages/faculty/FacultyAttendance";
import FacultyStudentRecords from "@/pages/faculty/FacultyStudentRecords";
import FacultyVerification from "@/pages/faculty/FacultyVerification";
import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentRecords from "@/pages/student/StudentRecords";
import StudentAttendance from "@/pages/student/StudentAttendance";
import StudentProfile from "@/pages/student/StudentProfile";
import StudentAchievements from "@/pages/student/StudentAchievements";
import StudentLeaderboard from "@/pages/student/StudentLeaderboard";
import StudentResumeBuilder from "@/pages/student/StudentResumeBuilder";
import StudentPortfolio from "@/pages/student/StudentPortfolio";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role) return <Navigate to={`/${role}`} replace />;
  return <Navigate to="/login" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUserManagement /></ProtectedRoute>} />
            <Route path="/admin/structure" element={<ProtectedRoute allowedRoles={["admin"]}><AdminStructure /></ProtectedRoute>} />

            <Route path="/faculty" element={<ProtectedRoute allowedRoles={["faculty"]}><FacultyDashboard /></ProtectedRoute>} />
            <Route path="/faculty/credentials" element={<ProtectedRoute allowedRoles={["faculty"]}><FacultyCredentials /></ProtectedRoute>} />
            <Route path="/faculty/marks" element={<ProtectedRoute allowedRoles={["faculty"]}><FacultyMarks /></ProtectedRoute>} />
            <Route path="/faculty/attendance" element={<ProtectedRoute allowedRoles={["faculty"]}><FacultyAttendance /></ProtectedRoute>} />
            <Route path="/faculty/students" element={<ProtectedRoute allowedRoles={["faculty"]}><FacultyStudentRecords /></ProtectedRoute>} />
            <Route path="/faculty/verification" element={<ProtectedRoute allowedRoles={["faculty"]}><FacultyVerification /></ProtectedRoute>} />

            <Route path="/student" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/records" element={<ProtectedRoute allowedRoles={["student"]}><StudentRecords /></ProtectedRoute>} />
            <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={["student"]}><StudentAttendance /></ProtectedRoute>} />
            <Route path="/student/achievements" element={<ProtectedRoute allowedRoles={["student"]}><StudentAchievements /></ProtectedRoute>} />
            <Route path="/student/leaderboard" element={<ProtectedRoute allowedRoles={["student"]}><StudentLeaderboard /></ProtectedRoute>} />
            <Route path="/student/resume" element={<ProtectedRoute allowedRoles={["student"]}><StudentResumeBuilder /></ProtectedRoute>} />
            <Route path="/student/portfolio" element={<ProtectedRoute allowedRoles={["student"]}><StudentPortfolio /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute allowedRoles={["student"]}><StudentProfile /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
