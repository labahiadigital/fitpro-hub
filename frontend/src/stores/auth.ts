import { create } from "zustand";
import { persist } from "zustand/middleware";

type UserRole = 'owner' | 'collaborator' | 'client';

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  role?: UserRole;
  workspace_id?: string;
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
        // onRehydrateStorage is called after rehydration completes
        // state contains the rehydrated values
        if (state) {
          const hasToken = !!state.accessToken;
          // Set _hasHydrated immediately so waitForHydration resolves
          state._hasHydrated = true;
          state.isAuthenticated = hasToken;
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
