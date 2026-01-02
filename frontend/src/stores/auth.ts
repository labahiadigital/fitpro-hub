import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DemoRole = "trainer" | "client" | null;

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  role?: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  branding?: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  currentWorkspace: Workspace | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  demoRole: DemoRole;

  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  logout: () => void;
  loginDemo: (role?: DemoRole) => void;
  loginDemoTrainer: () => void;
  loginDemoClient: () => void;
}

// Demo trainer user - Full access to all features
const demoTrainerUser: User = {
  id: "22222222-2222-2222-2222-222222222222",
  email: "entrenador@trackfiz.com",
  full_name: "Carlos Fitness",
  avatar_url: undefined,
  is_active: true,
  role: "owner",
};

// Demo client user - Limited access, client perspective
const demoClientUser: User = {
  id: "33333333-3333-3333-3333-333333333333",
  email: "cliente@trackfiz.com",
  full_name: "María García",
  avatar_url: undefined,
  is_active: true,
  role: "client",
};

const demoWorkspace: Workspace = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Trackfiz Demo",
  slug: "trackfiz-demo",
  logo_url: undefined,
  branding: {
    primary_color: "#2D6A4F",
    secondary_color: "#40916C",
    accent_color: "#95D5B2",
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      currentWorkspace: null,
      isAuthenticated: false,
      isDemoMode: false,
      demoRole: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: !!accessToken }),

      setWorkspace: (currentWorkspace) => set({ currentWorkspace }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          currentWorkspace: null,
          isAuthenticated: false,
          isDemoMode: false,
          demoRole: null,
        }),

      // Legacy demo login (defaults to trainer)
      loginDemo: (role: DemoRole = "trainer") =>
        set({
          user: role === "client" ? demoClientUser : demoTrainerUser,
          accessToken: "demo-token",
          refreshToken: "demo-refresh-token",
          currentWorkspace: demoWorkspace,
          isAuthenticated: true,
          isDemoMode: true,
          demoRole: role,
        }),

      // Demo login as trainer/admin
      loginDemoTrainer: () =>
        set({
          user: demoTrainerUser,
          accessToken: "demo-token",
          refreshToken: "demo-refresh-token",
          currentWorkspace: demoWorkspace,
          isAuthenticated: true,
          isDemoMode: true,
          demoRole: "trainer",
        }),

      // Demo login as client
      loginDemoClient: () =>
        set({
          user: demoClientUser,
          accessToken: "demo-token",
          refreshToken: "demo-refresh-token",
          currentWorkspace: demoWorkspace,
          isAuthenticated: true,
          isDemoMode: true,
          demoRole: "client",
        }),
    }),
    {
      name: "trackfiz-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        currentWorkspace: state.currentWorkspace,
        isDemoMode: state.isDemoMode,
        demoRole: state.demoRole,
      }),
    }
  )
);
