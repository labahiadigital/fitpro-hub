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
import { ConfirmEmailPage } from "./pages/auth/ConfirmEmailPage";
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
import { OnboardingPage } from "./pages/onboarding/OnboardingPage";
import { InvitationOnboardingPage } from "./pages/onboarding/InvitationOnboardingPage";
import { PackagesPage } from "./pages/packages/PackagesPage";
import { PaymentsPage } from "./pages/payments/PaymentsPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { TeamPage } from "./pages/team/TeamPage";
import { WorkoutsPage } from "./pages/workouts/WorkoutsPage";
// New Pages
import { SupplementsPage } from "./pages/supplements/SupplementsPage";
import { LMSPage } from "./pages/lms/LMSPage";
import { LiveClassesPage } from "./pages/live-classes/LiveClassesPage";
// Client-specific pages
import { 
  ClientDashboardPage,
  MyWorkoutsPage,
  MyNutritionPage,
  MyProgressPage,
  MyCalendarPage,
  MyDocumentsPage,
  MyProfilePage,
  MyMessagesPage,
} from "./pages/client";
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
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Wait for Zustand to hydrate from localStorage before checking auth
  if (!_hasHydrated) {
    return null; // or a loading spinner
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Wait for Zustand to hydrate from localStorage before checking auth
  if (!_hasHydrated) {
    return null; // or a loading spinner
  }

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />;
  }

  return <>{children}</>;
}

// Component that shows the right dashboard based on user role
function SmartDashboard() {
  const { user } = useAuthStore();
  
  if (user?.role === 'client') {
    return <ClientDashboardPage />;
  }
  
  return <DashboardPage />;
}

// Route guard for trainer-only routes
function TrainerRoute({ children }: { children: React.ReactNode }) {
  const { user, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return null;
  }

  // Redirect clients trying to access trainer routes
  if (user?.role === 'client') {
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
              {/* Redirect root to login (landing page is now in the web project) */}
              <Route element={<Navigate replace to="/login" />} path="/" />

              {/* Client Onboarding via invitation token (primary method) */}
              <Route
                element={<InvitationOnboardingPage />}
                path="/onboarding/invite/:token"
              />

              {/* Legacy: Client Onboarding via workspace slug */}
              <Route
                element={<ClientOnboardingPage />}
                path="/onboarding/:workspaceSlug"
              />

              {/* User Onboarding (after registration) */}
              <Route
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
                path="/complete-profile"
              />

              {/* Email confirmation (public, no layout) */}
              <Route element={<ConfirmEmailPage />} path="/auth/confirm" />

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
                {/* Smart Dashboard - shows different content based on role */}
                <Route element={<SmartDashboard />} path="/dashboard" />
                
                {/* Client-specific routes */}
                <Route element={<MyWorkoutsPage />} path="/my-workouts" />
                <Route element={<MyNutritionPage />} path="/my-nutrition" />
                <Route element={<MyProgressPage />} path="/my-progress" />
                <Route element={<MyCalendarPage />} path="/my-calendar" />
                <Route element={<MyDocumentsPage />} path="/my-documents" />
                <Route element={<MyProfilePage />} path="/my-profile" />
                <Route element={<MyMessagesPage />} path="/my-messages" />
                
                {/* Trainer chat page */}
                <Route element={<ChatPage />} path="/chat" />
                <Route element={<LMSPage />} path="/lms" />
                
                {/* Trainer-only routes */}
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

              {/* 404 */}
              <Route element={<Navigate replace to="/" />} path="*" />
            </Routes>
          </BrowserRouter>
        </DatesProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
