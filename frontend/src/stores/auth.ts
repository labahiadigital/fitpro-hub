import { create } from "zustand";
import { persist } from "zustand/middleware";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

type UserRole = 'owner' | 'collaborator' | 'client';

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  role?: UserRole;
  workspace_id?: string;
  preferences?: Record<string, any>;
  phone?: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  settings?: Record<string, any>;
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
  _hasHydrated: boolean;

  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      currentWorkspace: null,
      isAuthenticated: false,
      _hasHydrated: false,

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
        
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "trackfiz-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        currentWorkspace: state.currentWorkspace,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const hasValidToken =
            !!state.accessToken && !isTokenExpired(state.accessToken);
          state._hasHydrated = true;
          state.isAuthenticated = hasValidToken;
          if (!hasValidToken) {
            state.accessToken = null;
            state.refreshToken = null;
            state.user = null;
            state.currentWorkspace = null;
          }
        }
      },
    }
  )
);

// Helper to wait for hydration
export const waitForHydration = (): Promise<void> => {
  return new Promise((resolve) => {
    if (useAuthStore.getState()._hasHydrated) {
      resolve();
      return;
    }
    const unsub = useAuthStore.subscribe((state) => {
      if (state._hasHydrated) {
        unsub();
        resolve();
      }
    });
  });
};
