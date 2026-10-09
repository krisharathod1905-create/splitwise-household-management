import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { lazy, Suspense, Component } from "react";

import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// ─── Layouts ─────────────────────────────────────────────────────────────────
import PublicLayout from "@/components/layout/PublicLayout";
import CitizenLayout from "@/components/layout/CitizenLayout";
import StaffLayout from "@/components/layout/StaffLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import LoadingScreen from "@/components/ui/LoadingScreen";

// ─── Pages (lazy loaded) ─────────────────────────────────────────────────────
const LandingPage = lazy(() => import("@/pages/public/LandingPage"));
const OfficesPage = lazy(() => import("@/pages/public/OfficesPage"));
const OfficeDetailPage = lazy(() => import("@/pages/public/OfficeDetailPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));

const CitizenDashboard = lazy(() => import("@/pages/citizen/CitizenDashboard"));
const BookTokenPage = lazy(() => import("@/pages/citizen/BookTokenPage"));
const TokenDetailPage = lazy(() => import("@/pages/citizen/TokenDetailPage"));
const TokenHistoryPage = lazy(() => import("@/pages/citizen/TokenHistoryPage"));
const NotificationsPage = lazy(() => import("@/pages/citizen/NotificationsPage"));
const ProfilePage = lazy(() => import("@/pages/citizen/ProfilePage"));

const StaffDashboard = lazy(() => import("@/pages/staff/StaffDashboard"));
const StaffQueuePage = lazy(() => import("@/pages/staff/StaffQueuePage"));
const StaffCounterPage = lazy(() => import("@/pages/staff/StaffCounterPage"));

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminOfficesPage = lazy(() => import("@/pages/admin/AdminOfficesPage"));
const AdminStaffPage = lazy(() => import("@/pages/admin/AdminStaffPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/AdminAnalyticsPage"));
const AdminAuditPage = lazy(() => import("@/pages/admin/AdminAuditPage"));

// ─── Route Guards ─────────────────────────────────────────────────────────────
const RequireAuth = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const GuestOnly = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) {
    const redirectMap = { admin: "/admin", staff: "/staff", citizen: "/dashboard" };
    return <Navigate to={redirectMap[user?.role] || "/dashboard"} replace />;
  }
  return children;
};

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[QueueLess] Page render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "60vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--color-navy)", marginBottom: "0.5rem" }}>
            Something went wrong
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = "/"; }}
            style={{ padding: "0.625rem 1.5rem", background: "var(--color-blue)", color: "white",
              borderRadius: "0.75rem", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SuspenseWrapper = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
  </ErrorBoundary>
);

// ─── App Router ───────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<SuspenseWrapper><LandingPage /></SuspenseWrapper>} />
        <Route path="/offices" element={<SuspenseWrapper><OfficesPage /></SuspenseWrapper>} />
        <Route path="/offices/:officeId" element={<SuspenseWrapper><OfficeDetailPage /></SuspenseWrapper>} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<GuestOnly><SuspenseWrapper><LoginPage /></SuspenseWrapper></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><SuspenseWrapper><RegisterPage /></SuspenseWrapper></GuestOnly>} />

      {/* Citizen */}
      <Route element={<RequireAuth allowedRoles={["citizen", "admin", "staff"]}><CitizenLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<SuspenseWrapper><CitizenDashboard /></SuspenseWrapper>} />
        <Route path="/book-token" element={<SuspenseWrapper><BookTokenPage /></SuspenseWrapper>} />
        <Route path="/tokens/:tokenId" element={<SuspenseWrapper><TokenDetailPage /></SuspenseWrapper>} />
        <Route path="/history" element={<SuspenseWrapper><TokenHistoryPage /></SuspenseWrapper>} />
        <Route path="/notifications" element={<SuspenseWrapper><NotificationsPage /></SuspenseWrapper>} />
        <Route path="/profile" element={<SuspenseWrapper><ProfilePage /></SuspenseWrapper>} />
      </Route>

      {/* Staff */}
      <Route element={<RequireAuth allowedRoles={["staff", "admin"]}><StaffLayout /></RequireAuth>}>
        <Route path="/staff" element={<SuspenseWrapper><StaffDashboard /></SuspenseWrapper>} />
        <Route path="/staff/queue" element={<SuspenseWrapper><StaffQueuePage /></SuspenseWrapper>} />
        <Route path="/staff/counter" element={<SuspenseWrapper><StaffCounterPage /></SuspenseWrapper>} />
      </Route>

      {/* Admin */}
      <Route element={<RequireAuth allowedRoles={["admin"]}><AdminLayout /></RequireAuth>}>
        <Route path="/admin" element={<SuspenseWrapper><AdminDashboard /></SuspenseWrapper>} />
        <Route path="/admin/offices" element={<SuspenseWrapper><AdminOfficesPage /></SuspenseWrapper>} />
        <Route path="/admin/staff" element={<SuspenseWrapper><AdminStaffPage /></SuspenseWrapper>} />
        <Route path="/admin/analytics" element={<SuspenseWrapper><AdminAnalyticsPage /></SuspenseWrapper>} />
        <Route path="/admin/audit" element={<SuspenseWrapper><AdminAuditPage /></SuspenseWrapper>} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            richColors
            expand={true}
            toastOptions={{
              style: {
                fontFamily: "Inter, sans-serif",
                borderRadius: "0.75rem",
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
