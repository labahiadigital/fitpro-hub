import { create } from "zustand";
import { persist } from "zustand/middleware";

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

  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      currentWorkspace: null,
      isAuthenticated: false,

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
        }),
    }),
    {
      name: "trackfiz-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        currentWorkspace: state.currentWorkspace,
      }),
    }
  )
);
