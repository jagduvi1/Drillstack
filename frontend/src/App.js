import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "./components/layout/Sidebar";
import ProtectedRoute from "./components/common/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import DrillsPage from "./pages/DrillsPage";
import DrillFormPage from "./pages/DrillFormPage";
import DrillDetailPage from "./pages/DrillDetailPage";
import DrillRefinePage from "./pages/DrillRefinePage";
import SessionsPage from "./pages/SessionsPage";
import SessionFormPage from "./pages/SessionFormPage";
import SessionDetailPage from "./pages/SessionDetailPage";
import SessionPrintPage from "./pages/SessionPrintPage";
import PlansPage from "./pages/PlansPage";
import PlanFormPage from "./pages/PlanFormPage";
import PlanDetailPage from "./pages/PlanDetailPage";
import TodayPage from "./pages/TodayPage";
import SearchPage from "./pages/SearchPage";
import SuperAdminPage from "./pages/SuperAdmin";
import NotificationsPage from "./pages/NotificationsPage";
import GroupsPage from "./pages/GroupsPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import GroupFormPage from "./pages/GroupFormPage";
import GroupJoinPage from "./pages/GroupJoinPage";
import SettingsPage from "./pages/SettingsPage";
import PricingPage from "./pages/PricingPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
const TacticBoardListPage = lazy(() => import("./pages/TacticBoardListPage"));
const TacticBoardPage = lazy(() => import("./pages/TacticBoardPage"));
import { useAuth } from "./context/AuthContext";
import { FiMenu } from "react-icons/fi";

export default function App() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("sidebar-open-body");
    } else {
      document.body.classList.remove("sidebar-open-body");
    }
    return () => document.body.classList.remove("sidebar-open-body");
  }, [sidebarOpen]);

  if (loading) return <div className="loading">{t("common.loading")}</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      {/* Mobile top header */}
      <header className="mobile-header">
        <button
          className="mobile-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <FiMenu />
        </button>
        <span className="mobile-header-title">{t("common.appName")}</span>
      </header>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-main">
        <Suspense fallback={<div className="loading">{t("common.loading")}</div>}>
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
          <Route path="/sessions/:id/print" element={<ProtectedRoute><SessionPrintPage /></ProtectedRoute>} />
          <Route path="/sessions/:id/edit" element={<ProtectedRoute><SessionFormPage /></ProtectedRoute>} />
          <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
          <Route path="/plans/new" element={<ProtectedRoute><PlanFormPage /></ProtectedRoute>} />
          <Route path="/plans/:id" element={<ProtectedRoute><PlanDetailPage /></ProtectedRoute>} />
          <Route path="/plans/:id/edit" element={<ProtectedRoute><PlanFormPage /></ProtectedRoute>} />
          <Route path="/tactics" element={<ProtectedRoute><TacticBoardListPage /></ProtectedRoute>} />
          <Route path="/tactics/new" element={<ProtectedRoute><TacticBoardPage /></ProtectedRoute>} />
          <Route path="/tactics/:id" element={<ProtectedRoute><TacticBoardPage /></ProtectedRoute>} />
          <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
          <Route path="/groups/new" element={<ProtectedRoute><GroupFormPage /></ProtectedRoute>} />
          <Route path="/groups/join/:code" element={<ProtectedRoute><GroupJoinPage /></ProtectedRoute>} />
          <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          {user.isSuperAdmin && (
            <Route path="/superadmin" element={<ProtectedRoute><SuperAdminPage /></ProtectedRoute>} />
          )}
        </Routes>
        </Suspense>
      </main>
    </div>
  );
}
