import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import TodayPage from "./pages/TodayPage";
import SearchPage from "./pages/SearchPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import NotificationsPage from "./pages/NotificationsPage";
import GroupsPage from "./pages/GroupsPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import GroupFormPage from "./pages/GroupFormPage";
import GroupJoinPage from "./pages/GroupJoinPage";
import PricingPage from "./pages/PricingPage";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();

  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  if (loading) return <div className="loading">{t("common.loading")}</div>;

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
          <Route path="/today" element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
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
          <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
          <Route path="/groups/new" element={<ProtectedRoute><GroupFormPage /></ProtectedRoute>} />
          <Route path="/groups/join/:code" element={<ProtectedRoute><GroupJoinPage /></ProtectedRoute>} />
          <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          {user.isSuperAdmin && (
            <Route path="/superadmin" element={<ProtectedRoute><SuperAdminPage /></ProtectedRoute>} />
          )}
        </Routes>
      </main>
    </div>
  );
}
