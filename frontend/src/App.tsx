import { Suspense, lazy, useEffect } from "react";
import { Center, Loader, MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "./components/layout/AuthLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { useAuthStore } from "./stores/auth";
import { theme } from "./theme";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/charts/styles.css";
import "dayjs/locale/es";

// Lazy-loaded pages — each becomes a separate chunk
const LoginPage = lazy(() => import("./pages/auth/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage").then(m => ({ default: m.RegisterPage })));
const ConfirmEmailPage = lazy(() => import("./pages/auth/ConfirmEmailPage").then(m => ({ default: m.ConfirmEmailPage })));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const GoogleCallbackPage = lazy(() => import("./pages/auth/GoogleCallbackPage").then(m => ({ default: m.GoogleCallbackPage })));
const InvitationOnboardingPage = lazy(() => import("./pages/onboarding/InvitationOnboardingPage").then(m => ({ default: m.InvitationOnboardingPage })));
const ClientOnboardingPage = lazy(() => import("./pages/onboarding/ClientOnboardingPage").then(m => ({ default: m.ClientOnboardingPage })));
const OnboardingPage = lazy(() => import("./pages/onboarding/OnboardingPage").then(m => ({ default: m.OnboardingPage })));

const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })));
const ClientsPage = lazy(() => import("./pages/clients/ClientsPage").then(m => ({ default: m.ClientsPage })));
const ClientDetailPage = lazy(() => import("./pages/clients/ClientDetailPage").then(m => ({ default: m.ClientDetailPage })));
const CalendarPage = lazy(() => import("./pages/calendar/CalendarPage").then(m => ({ default: m.CalendarPage })));
const WorkoutsPage = lazy(() => import("./pages/workouts/WorkoutsPage"));
const NutritionPage = lazy(() => import("./pages/nutrition/NutritionPage").then(m => ({ default: m.NutritionPage })));
const MealPlanDetailPage = lazy(() => import("./pages/nutrition/MealPlanDetailPage").then(m => ({ default: m.MealPlanDetailPage })));
const SupplementsPage = lazy(() => import("./pages/supplements/SupplementsPage").then(m => ({ default: m.SupplementsPage })));
const FormsPage = lazy(() => import("./pages/forms/FormsPage").then(m => ({ default: m.FormsPage })));
const PaymentsPage = lazy(() => import("./pages/payments/PaymentsPage").then(m => ({ default: m.PaymentsPage })));
const PackagesPage = lazy(() => import("./pages/packages/PackagesPage").then(m => ({ default: m.PackagesPage })));
const CommunityPage = lazy(() => import("./pages/community/CommunityPage").then(m => ({ default: m.CommunityPage })));
const DocumentsPage = lazy(() => import("./pages/documents/DocumentsPage").then(m => ({ default: m.DocumentsPage })));
const TeamPage = lazy(() => import("./pages/team/TeamPage").then(m => ({ default: m.TeamPage })));
const AutomationsPage = lazy(() => import("./pages/automations/AutomationsPage").then(m => ({ default: m.AutomationsPage })));
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage").then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const LiveClassesPage = lazy(() => import("./pages/live-classes/LiveClassesPage").then(m => ({ default: m.LiveClassesPage })));
const ChatPage = lazy(() => import("./pages/chat/ChatPage").then(m => ({ default: m.ChatPage })));
const LMSPage = lazy(() => import("./pages/lms/LMSPage").then(m => ({ default: m.LMSPage })));

// Client pages
const ClientDashboardPage = lazy(() => import("./pages/client").then(m => ({ default: m.ClientDashboardPage })));
const MyWorkoutsPage = lazy(() => import("./pages/client").then(m => ({ default: m.MyWorkoutsPage })));
const MyNutritionPage = lazy(() => import("./pages/client").then(m => ({ default: m.MyNutritionPage })));
const MyProgressPage = lazy(() => import("./pages/client").then(m => ({ default: m.MyProgressPage })));
const MyCalendarPage = lazy(() => import("./pages/client").then(m => ({ default: m.MyCalendarPage })));
const MyDocumentsPage = lazy(() => import("./pages/client").then(m => ({ default: m.MyDocumentsPage })));
const MyProfilePage = lazy(() => import("./pages/client").then(m => ({ default: m.MyProfilePage })));
const MyMessagesPage = lazy(() => import("./pages/client").then(m => ({ default: m.MyMessagesPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnReconnect: false,
    },
  },
});

function PageLoader() {
  return (
    <Center h="50vh">
      <Loader size="md" color="var(--nv-primary)" />
    </Center>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />;
  }

  return <>{children}</>;
}

function SmartDashboard() {
  const { user } = useAuthStore();
  
  if (user?.role === 'client') {
    return <ClientDashboardPage />;
  }
  
  return <DashboardPage />;
}

function TrainerRoute({ children }: { children: React.ReactNode }) {
  const { user, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return null;
  }

  if (user?.role === 'client') {
    return <Navigate replace to="/dashboard" />;
  }

  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;
    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target?.matches?.("input, textarea, [contenteditable=true]")) {
        window.setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
      }
    };
    document.addEventListener("blur", handleBlur, true);
    return () => document.removeEventListener("blur", handleBlur, true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider defaultColorScheme="light" theme={theme}>
        <DatesProvider settings={{ locale: "es" }}>
          <Notifications position="top-right" />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<Navigate replace to="/login" />} path="/" />

                <Route
                  element={<InvitationOnboardingPage />}
                  path="/onboarding/invite/:token"
                />

                <Route
                  element={<ClientOnboardingPage />}
                  path="/onboarding/:workspaceSlug"
                />

                <Route
                  element={
                    <ProtectedRoute>
                      <OnboardingPage />
                    </ProtectedRoute>
                  }
                  path="/complete-profile"
                />

                <Route element={<ConfirmEmailPage />} path="/auth/confirm" />
                <Route element={<ForgotPasswordPage />} path="/forgot-password" />
                <Route element={<ResetPasswordPage />} path="/auth/reset-password" />
                
                <Route
                  element={
                    <ProtectedRoute>
                      <GoogleCallbackPage />
                    </ProtectedRoute>
                  }
                  path="/auth/google/callback"
                />

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

                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route element={<SmartDashboard />} path="/dashboard" />
                  
                  <Route element={<MyWorkoutsPage />} path="/my-workouts" />
                  <Route element={<MyNutritionPage />} path="/my-nutrition" />
                  <Route element={<MyProgressPage />} path="/my-progress" />
                  <Route element={<MyCalendarPage />} path="/my-calendar" />
                  <Route element={<MyDocumentsPage />} path="/my-documents" />
                  <Route element={<MyProfilePage />} path="/my-profile" />
                  <Route element={<MyMessagesPage />} path="/my-messages" />
                  
                  <Route element={<ChatPage />} path="/chat" />
                  <Route element={<LMSPage />} path="/lms" />
                  
                  <Route element={<TrainerRoute><ClientsPage /></TrainerRoute>} path="/clients" />
                  <Route element={<TrainerRoute><ClientDetailPage /></TrainerRoute>} path="/clients/:id" />
                  <Route element={<TrainerRoute><CalendarPage /></TrainerRoute>} path="/calendar" />
                  <Route element={<TrainerRoute><WorkoutsPage /></TrainerRoute>} path="/workouts" />
                  <Route element={<TrainerRoute><NutritionPage /></TrainerRoute>} path="/nutrition" />
                  <Route element={<TrainerRoute><MealPlanDetailPage /></TrainerRoute>} path="/nutrition/:id" />
                  <Route element={<TrainerRoute><SupplementsPage /></TrainerRoute>} path="/supplements" />
                  <Route element={<TrainerRoute><FormsPage /></TrainerRoute>} path="/forms" />
                  <Route element={<TrainerRoute><PaymentsPage /></TrainerRoute>} path="/payments" />
                  <Route element={<TrainerRoute><PackagesPage /></TrainerRoute>} path="/packages" />
                  <Route element={<TrainerRoute><CommunityPage /></TrainerRoute>} path="/community" />
                  <Route element={<TrainerRoute><DocumentsPage /></TrainerRoute>} path="/documents" />
                  <Route element={<TrainerRoute><TeamPage /></TrainerRoute>} path="/team" />
                  <Route element={<TrainerRoute><AutomationsPage /></TrainerRoute>} path="/automations" />
                  <Route element={<TrainerRoute><ReportsPage /></TrainerRoute>} path="/reports" />
                  <Route element={<TrainerRoute><LiveClassesPage /></TrainerRoute>} path="/live-classes" />
                  <Route element={<TrainerRoute><SettingsPage /></TrainerRoute>} path="/settings" />
                </Route>

                <Route element={<Navigate replace to="/" />} path="*" />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </DatesProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
