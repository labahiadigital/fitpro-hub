import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DatesProvider } from '@mantine/dates'
import { theme } from './theme'
import { useAuthStore } from './stores/auth'

// Layouts
import { DashboardLayout } from './components/layout/DashboardLayout'
import { AuthLayout } from './components/layout/AuthLayout'

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'

// Dashboard Pages
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ClientsPage } from './pages/clients/ClientsPage'
import { ClientDetailPage } from './pages/clients/ClientDetailPage'
import { CalendarPage } from './pages/calendar/CalendarPage'
import { WorkoutsPage } from './pages/workouts/WorkoutsPage'
import { NutritionPage } from './pages/nutrition/NutritionPage'
import { ChatPage } from './pages/chat/ChatPage'
import { PaymentsPage } from './pages/payments/PaymentsPage'
import { FormsPage } from './pages/forms/FormsPage'
import { AutomationsPage } from './pages/automations/AutomationsPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { PackagesPage } from './pages/packages/PackagesPage'
import { CommunityPage } from './pages/community/CommunityPage'

// Public Pages
import { LandingPage } from './pages/public/LandingPage'
import { ClientOnboardingPage } from './pages/onboarding/ClientOnboardingPage'

// Mantine styles
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/charts/styles.css'
import 'dayjs/locale/es'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <DatesProvider settings={{ locale: 'es' }}>
          <Notifications position="top-right" />
          <BrowserRouter>
            <Routes>
              {/* Public Landing Page */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Client Onboarding (public) */}
              <Route path="/onboarding/:workspaceSlug" element={<ClientOnboardingPage />} />
              
              {/* Auth routes */}
              <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/clients/:id" element={<ClientDetailPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/workouts" element={<WorkoutsPage />} />
                <Route path="/nutrition" element={<NutritionPage />} />
                <Route path="/forms" element={<FormsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/packages" element={<PackagesPage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/automations" element={<AutomationsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              
              {/* 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </DatesProvider>
      </MantineProvider>
    </QueryClientProvider>
  )
}
