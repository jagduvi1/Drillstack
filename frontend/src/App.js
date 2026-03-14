import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import ProtectedRoute from "./components/common/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import DrillsPage from "./pages/DrillsPage";
import DrillFormPage from "./pages/DrillFormPage";
import DrillDetailPage from "./pages/DrillDetailPage";
import DrillRefinePage from "./pages/DrillRefinePage";
import SessionsPage from "./pages/SessionsPage";
import SessionFormPage from "./pages/SessionFormPage";
import SessionDetailPage from "./pages/SessionDetailPage";
import PlansPage from "./pages/PlansPage";
import PlanFormPage from "./pages/PlanFormPage";
import PlanDetailPage from "./pages/PlanDetailPage";
import SearchPage from "./pages/SearchPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/drills" element={<ProtectedRoute><DrillsPage /></ProtectedRoute>} />
          <Route path="/drills/new" element={<ProtectedRoute><DrillFormPage /></ProtectedRoute>} />
          <Route path="/drills/:id" element={<ProtectedRoute><DrillDetailPage /></ProtectedRoute>} />
          <Route path="/drills/:id/edit" element={<ProtectedRoute><DrillFormPage /></ProtectedRoute>} />
          <Route path="/drills/:id/refine" element={<ProtectedRoute><DrillRefinePage /></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
          <Route path="/sessions/new" element={<ProtectedRoute><SessionFormPage /></ProtectedRoute>} />
          <Route path="/sessions/:id" element={<ProtectedRoute><SessionDetailPage /></ProtectedRoute>} />
          <Route path="/sessions/:id/edit" element={<ProtectedRoute><SessionFormPage /></ProtectedRoute>} />
          <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
          <Route path="/plans/new" element={<ProtectedRoute><PlanFormPage /></ProtectedRoute>} />
          <Route path="/plans/:id" element={<ProtectedRoute><PlanDetailPage /></ProtectedRoute>} />
          <Route path="/plans/:id/edit" element={<ProtectedRoute><PlanFormPage /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          {user.isSuperAdmin && (
            <Route path="/superadmin" element={<ProtectedRoute><SuperAdminPage /></ProtectedRoute>} />
          )}
        </Routes>
      </main>
    </div>
  );
}
