import { Suspense, lazy, type ComponentType } from "react";
import { Center, Loader, MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { Notifications, notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthLayout } from "./components/layout/AuthLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { useAuthStore } from "./stores/auth";
import { getApiErrorMessage } from "./utils/getApiErrorMessage";
import { theme } from "./theme";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/charts/styles.css";
import "dayjs/locale/es";

function lazyRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((err: Error) => {
      const reloaded = sessionStorage.getItem("trackfiz-chunk-retry");
      if (!reloaded || Date.now() - Number(reloaded) > 10_000) {
        sessionStorage.setItem("trackfiz-chunk-retry", String(Date.now()));
        window.location.reload();
      }
      throw err;
    }),
  );
}

const LoginPage = lazyRetry(() => import("./pages/auth/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazyRetry(() => import("./pages/auth/RegisterPage").then(m => ({ default: m.RegisterPage })));
const ConfirmEmailPage = lazyRetry(() => import("./pages/auth/ConfirmEmailPage").then(m => ({ default: m.ConfirmEmailPage })));
const ForgotPasswordPage = lazyRetry(() => import("./pages/auth/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazyRetry(() => import("./pages/auth/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const GoogleCallbackPage = lazyRetry(() => import("./pages/auth/GoogleCallbackPage").then(m => ({ default: m.GoogleCallbackPage })));
const InvitationOnboardingPage = lazyRetry(() => import("./pages/onboarding/InvitationOnboardingPage").then(m => ({ default: m.InvitationOnboardingPage })));
const ClientOnboardingPage = lazyRetry(() => import("./pages/onboarding/ClientOnboardingPage").then(m => ({ default: m.ClientOnboardingPage })));
const OnboardingPage = lazyRetry(() => import("./pages/onboarding/OnboardingPage").then(m => ({ default: m.OnboardingPage })));
const AcceptStaffInvitePage = lazyRetry(() => import("./pages/auth/AcceptStaffInvitePage").then(m => ({ default: m.AcceptStaffInvitePage })));

const DashboardPage = lazyRetry(() => import("./pages/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })));
const ClientsPage = lazyRetry(() => import("./pages/clients/ClientsPage").then(m => ({ default: m.ClientsPage })));
const ClientDetailPage = lazyRetry(() => import("./pages/clients/ClientDetailPage").then(m => ({ default: m.ClientDetailPage })));
const CalendarPage = lazyRetry(() => import("./pages/calendar/CalendarPage").then(m => ({ default: m.CalendarPage })));
const WorkoutsPage = lazyRetry(() => import("./pages/workouts/WorkoutsPage"));
const NutritionPage = lazyRetry(() => import("./pages/nutrition/NutritionPage").then(m => ({ default: m.NutritionPage })));
const MealPlanDetailPage = lazyRetry(() => import("./pages/nutrition/MealPlanDetailPage").then(m => ({ default: m.MealPlanDetailPage })));
const SupplementsPage = lazyRetry(() => import("./pages/supplements/SupplementsPage").then(m => ({ default: m.SupplementsPage })));
const FormsPage = lazyRetry(() => import("./pages/forms/FormsPage").then(m => ({ default: m.FormsPage })));
const CatalogPage = lazyRetry(() => import("./pages/payments/CatalogPage").then(m => ({ default: m.CatalogPage })));
const StockPage = lazyRetry(() => import("./pages/stock/StockPage").then(m => ({ default: m.StockPage })));
const BoxesPage = lazyRetry(() => import("./pages/boxes/BoxesPage"));
const MachinesPage = lazyRetry(() => import("./pages/machines/MachinesPage"));
const BillingPage = lazyRetry(() => import("./pages/payments/BillingPage").then(m => ({ default: m.BillingPage })));
const CommunityPage = lazyRetry(() => import("./pages/community/CommunityPage").then(m => ({ default: m.CommunityPage })));
const DocumentsPage = lazyRetry(() => import("./pages/documents/DocumentsPage").then(m => ({ default: m.DocumentsPage })));
const TeamPage = lazyRetry(() => import("./pages/team/TeamPage").then(m => ({ default: m.TeamPage })));
const TimeClockPage = lazyRetry(() => import("./pages/team/TimeClockPage"));
const ReportsPage = lazyRetry(() => import("./pages/reports/ReportsPage").then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazyRetry(() => import("./pages/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const LiveClassesPage = lazyRetry(() => import("./pages/live-classes/LiveClassesPage").then(m => ({ default: m.LiveClassesPage })));
const ChatPage = lazyRetry(() => import("./pages/chat/ChatPage").then(m => ({ default: m.ChatPage })));
const TasksPage = lazyRetry(() => import("./pages/tasks/TasksPage"));
const LMSPage = lazyRetry(() => import("./pages/lms/LMSPage").then(m => ({ default: m.LMSPage })));

const ClientDashboardPage = lazyRetry(() => import("./pages/client/ClientDashboardPage").then(m => ({ default: m.ClientDashboardPage })));
const MyWorkoutsPage = lazyRetry(() => import("./pages/client/MyWorkoutsPage").then(m => ({ default: m.MyWorkoutsPage })));
const MyNutritionPage = lazyRetry(() => import("./pages/client/MyNutritionPage").then(m => ({ default: m.MyNutritionPage })));
const MyProgressPage = lazyRetry(() => import("./pages/client/MyProgressPage").then(m => ({ default: m.MyProgressPage })));
const MyCalendarPage = lazyRetry(() => import("./pages/client/MyCalendarPage").then(m => ({ default: m.MyCalendarPage })));
const MyDocumentsPage = lazyRetry(() => import("./pages/client/MyDocumentsPage").then(m => ({ default: m.MyDocumentsPage })));
const MyFormsPage = lazyRetry(() => import("./pages/my-forms/MyFormsPage").then(m => ({ default: m.MyFormsPage })));
const MyProfilePage = lazyRetry(() => import("./pages/client/MyProfilePage").then(m => ({ default: m.MyProfilePage })));
const MyMessagesPage = lazyRetry(() => import("./pages/client/MyMessagesPage").then(m => ({ default: m.MyMessagesPage })));
const NotFoundPage = lazyRetry(() => import("./pages/NotFoundPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnReconnect: true,
    },
    mutations: {
      onError: (error: unknown) => {
        notifications.show({
          title: "Error",
          message: getApiErrorMessage(error),
          color: "red",
        });
      },
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
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return <PageLoader />;
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

const ROUTE_RESOURCE_MAP: Record<string, string> = {
  "/clients": "clients",
  "/calendar": "calendar",
  "/workouts": "workouts",
  "/nutrition": "nutrition",
  "/supplements": "nutrition",
  "/forms": "forms",
  "/catalog": "catalog",
  "/stock": "catalog",
  "/boxes": "catalog",
  "/machines": "catalog",
  "/billing": "billing",
  "/community": "community",
  "/documents": "documents",
  "/team": "team",
  "/time-clock": "team",
  "/reports": "reports",
  "/settings": "settings",
  "/live-classes": "live_classes",
  "/chat": "chat",
  "/lms": "lms",
};

function TrainerRoute({ children }: { children: React.ReactNode }) {
  const { user, _hasHydrated } = useAuthStore();
  const { pathname } = useLocation();

  if (!_hasHydrated) {
    return <PageLoader />;
  }

  if (user?.role === 'client') {
    return <Navigate replace to="/dashboard" />;
  }

  if (user?.role === 'owner') {
    return <>{children}</>;
  }

  const base = "/" + pathname.split("/").filter(Boolean)[0];
  const resource = ROUTE_RESOURCE_MAP[base];

  if (resource && user?.permissions) {
    const perms = user.permissions[resource];
    if (!perms || perms.length === 0) {
      return <Navigate replace to="/dashboard" />;
    }
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider defaultColorScheme="light" theme={theme}>
        <DatesProvider settings={{ locale: "es" }}>
          <ModalsProvider>
          <Notifications position="top-right" />
          <ErrorBoundary>
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
                <Route element={<AcceptStaffInvitePage />} path="/auth/accept-invite" />
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
                  <Route element={<MyFormsPage />} path="/my-forms" />
                  <Route element={<MyProfilePage />} path="/my-profile" />
                  <Route element={<MyMessagesPage />} path="/my-messages" />
                  
                  <Route element={<ChatPage />} path="/chat" />
                  <Route element={<LMSPage />} path="/lms" />
                  
                  <Route element={<TrainerRoute><ClientsPage /></TrainerRoute>} path="/clients" />
                  <Route element={<TrainerRoute><ClientDetailPage /></TrainerRoute>} path="/clients/:id" />
                  <Route element={<TrainerRoute><CalendarPage /></TrainerRoute>} path="/calendar" />
                  <Route element={<TrainerRoute><TasksPage /></TrainerRoute>} path="/tasks" />
                  <Route element={<TrainerRoute><WorkoutsPage /></TrainerRoute>} path="/workouts" />
                  <Route element={<TrainerRoute><NutritionPage /></TrainerRoute>} path="/nutrition" />
                  <Route element={<TrainerRoute><MealPlanDetailPage /></TrainerRoute>} path="/nutrition/:id" />
                  <Route element={<TrainerRoute><SupplementsPage /></TrainerRoute>} path="/supplements" />
                  <Route element={<TrainerRoute><FormsPage /></TrainerRoute>} path="/forms" />
                  <Route element={<TrainerRoute><CatalogPage /></TrainerRoute>} path="/catalog" />
                  <Route element={<TrainerRoute><StockPage /></TrainerRoute>} path="/stock" />
                  <Route element={<TrainerRoute><BoxesPage /></TrainerRoute>} path="/boxes" />
                  <Route element={<TrainerRoute><MachinesPage /></TrainerRoute>} path="/machines" />
                  <Route element={<TrainerRoute><BillingPage /></TrainerRoute>} path="/billing" />
                  <Route element={<Navigate replace to="/billing" />} path="/payments" />
                  <Route element={<Navigate replace to="/catalog" />} path="/packages" />
                  <Route element={<TrainerRoute><CommunityPage /></TrainerRoute>} path="/community" />
                  <Route element={<TrainerRoute><DocumentsPage /></TrainerRoute>} path="/documents" />
                  <Route element={<TrainerRoute><TeamPage /></TrainerRoute>} path="/team" />
                  <Route element={<TrainerRoute><TeamPage /></TrainerRoute>} path="/team/members" />
                  <Route element={<TrainerRoute><TeamPage /></TrainerRoute>} path="/team/groups" />
                  <Route element={<TrainerRoute><TeamPage /></TrainerRoute>} path="/team/roles" />
                  <Route element={<TrainerRoute><TimeClockPage /></TrainerRoute>} path="/time-clock" />
                  <Route element={<Navigate replace to="/settings?tab=automations" />} path="/automations" />
                  <Route element={<Navigate replace to="/settings?tab=suggestions" />} path="/suggestions" />
                  <Route element={<TrainerRoute><ReportsPage /></TrainerRoute>} path="/reports" />
                  <Route element={<TrainerRoute><LiveClassesPage /></TrainerRoute>} path="/live-classes" />
                  <Route element={<TrainerRoute><SettingsPage /></TrainerRoute>} path="/settings" />
                </Route>

                <Route element={<NotFoundPage />} path="*" />
              </Routes>
            </Suspense>
          </BrowserRouter>
          </ErrorBoundary>
          </ModalsProvider>
        </DatesProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
