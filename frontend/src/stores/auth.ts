import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  is_active: boolean
  role?: string
}

interface Workspace {
  id: string
  name: string
  slug: string
  logo_url?: string
  branding?: {
    primary_color: string
    secondary_color: string
    accent_color: string
  }
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  currentWorkspace: Workspace | null
  isAuthenticated: boolean
  isDemoMode: boolean
  
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken?: string) => void
  setWorkspace: (workspace: Workspace | null) => void
  logout: () => void
  loginDemo: () => void
}

// Demo user and workspace for testing
const demoUser: User = {
  id: 'demo-user-1',
  email: 'demo@fitprohub.com',
  full_name: 'Usuario Demo',
  avatar_url: null,
  is_active: true,
  role: 'owner',
}

const demoWorkspace: Workspace = {
  id: 'demo-workspace-1',
  name: 'FitPro Demo',
  slug: 'fitpro-demo',
  logo_url: null,
  branding: {
    primary_color: '#2D6A4F',
    secondary_color: '#40916C',
    accent_color: '#95D5B2',
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      currentWorkspace: null,
      isAuthenticated: false,
      isDemoMode: false,
      
      setUser: (user) => 
        set({ user, isAuthenticated: !!user }),
      
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: !!accessToken }),
      
      setWorkspace: (currentWorkspace) =>
        set({ currentWorkspace }),
      
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          currentWorkspace: null,
          isAuthenticated: false,
          isDemoMode: false,
        }),
      
      loginDemo: () =>
        set({
          user: demoUser,
          accessToken: 'demo-token',
          refreshToken: 'demo-refresh-token',
          currentWorkspace: demoWorkspace,
          isAuthenticated: true,
          isDemoMode: true,
        }),
    }),
    {
      name: 'fitprohub-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        currentWorkspace: state.currentWorkspace,
        isDemoMode: state.isDemoMode,
      }),
    }
  )
)
