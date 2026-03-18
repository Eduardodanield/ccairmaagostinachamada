import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BugReportButton } from "@/components/BugReportButton";

// Pages
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminStudents from "./pages/admin/Students";
import AdminClassrooms from "./pages/admin/Classrooms";
import AdminTeachers from "./pages/admin/Teachers";
import AdminAttendance from "./pages/admin/Attendance";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminBugReports from "./pages/admin/BugReports";

// Teacher Pages
import TeacherHome from "./pages/teacher/Home";
import TeacherAttendance from "./pages/teacher/TakeAttendance";
import TeacherStats from "./pages/teacher/Stats";
import TeacherActivities from "./pages/teacher/Activities";

const queryClient = new QueryClient();

function AppRoutes() {
  const { role, isLoading } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Root redirect based on role */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {role === 'director' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/teacher" replace />
            )}
          </ProtectedRoute>
        }
      />
      
      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['director']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute allowedRoles={['director']}>
            <AdminStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/classrooms"
        element={
          <ProtectedRoute allowedRoles={['director']}>
            <AdminClassrooms />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/teachers"
        element={
          <ProtectedRoute allowedRoles={['director']}>
            <AdminTeachers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute allowedRoles={['director']}>
            <AdminAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={['director']}>
            <AdminAnalytics />
          </ProtectedRoute>
        }
      />
      
      {/* Teacher Routes */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/attendance/:classroomId"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/stats"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherStats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/activities"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherActivities />
          </ProtectedRoute>
        }
      />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
    };
    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);
    };
    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
              <BugReportButton />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
