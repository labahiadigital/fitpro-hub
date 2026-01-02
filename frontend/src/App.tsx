import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "./components/layout/AuthLayout";
// Layouts
import { DashboardLayout } from "./components/layout/DashboardLayout";
// Auth Pages
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { AutomationsPage } from "./pages/automations/AutomationsPage";
import { CalendarPage } from "./pages/calendar/CalendarPage";
import { ChatPage } from "./pages/chat/ChatPage";
import { ClientDetailPage } from "./pages/clients/ClientDetailPage";
import { ClientsPage } from "./pages/clients/ClientsPage";
import { CommunityPage } from "./pages/community/CommunityPage";
// Dashboard Pages
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { DocumentsPage } from "./pages/documents/DocumentsPage";
import { FormsPage } from "./pages/forms/FormsPage";
import { NutritionPage } from "./pages/nutrition/NutritionPage";
import { MealPlanDetailPage } from "./pages/nutrition/MealPlanDetailPage";
import { ClientOnboardingPage } from "./pages/onboarding/ClientOnboardingPage";
import { PackagesPage } from "./pages/packages/PackagesPage";
import { PaymentsPage } from "./pages/payments/PaymentsPage";
// Public Pages
import { LandingPage } from "./pages/public/LandingPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { TeamPage } from "./pages/team/TeamPage";
import { WorkoutsPage } from "./pages/workouts/WorkoutsPage";
// New Pages
import { SupplementsPage } from "./pages/supplements/SupplementsPage";
import { useAuthStore } from "./stores/auth";
import { theme } from "./theme";

// Mantine styles
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/charts/styles.css";
import "dayjs/locale/es";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider defaultColorScheme="light" theme={theme}>
        <DatesProvider settings={{ locale: "es" }}>
          <Notifications position="top-right" />
          <BrowserRouter>
            <Routes>
              {/* Public Landing Page */}
              <Route element={<LandingPage />} path="/" />

              {/* Client Onboarding (public) */}
              <Route
                element={<ClientOnboardingPage />}
                path="/onboarding/:workspaceSlug"
              />

              {/* Auth routes */}
              <Route
                element={
                  <PublicRoute>
                    <AuthLayout />
                  </PublicRoute>
                }
              >
                <Route element={<LoginPage />} path="/login" />
                <Route element={<RegisterPage />} path="/register" />
              </Route>

              {/* Protected routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route element={<DashboardPage />} path="/dashboard" />
                <Route element={<ClientsPage />} path="/clients" />
                <Route element={<ClientDetailPage />} path="/clients/:id" />
                <Route element={<CalendarPage />} path="/calendar" />
                <Route element={<WorkoutsPage />} path="/workouts" />
                <Route element={<NutritionPage />} path="/nutrition" />
                <Route element={<MealPlanDetailPage />} path="/nutrition/:id" />
                <Route element={<SupplementsPage />} path="/supplements" />
                <Route element={<FormsPage />} path="/forms" />
                <Route element={<ChatPage />} path="/chat" />
                <Route element={<PaymentsPage />} path="/payments" />
                <Route element={<PackagesPage />} path="/packages" />
                <Route element={<CommunityPage />} path="/community" />
                <Route element={<DocumentsPage />} path="/documents" />
                <Route element={<TeamPage />} path="/team" />
                <Route element={<AutomationsPage />} path="/automations" />
                <Route element={<ReportsPage />} path="/reports" />
                <Route element={<SettingsPage />} path="/settings" />
              </Route>

              {/* 404 */}
              <Route element={<Navigate replace to="/" />} path="*" />
            </Routes>
          </BrowserRouter>
        </DatesProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
