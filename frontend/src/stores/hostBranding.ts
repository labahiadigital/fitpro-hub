import { create } from "zustand";

export interface HostWorkspaceBranding {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  logo_url?: string | null;
  branding?: {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
  };
}

interface HostBrandingState {
  hostWorkspace: HostWorkspaceBranding | null;
  resolved: boolean;
  setHostWorkspace: (ws: HostWorkspaceBranding | null) => void;
  setResolved: (resolved: boolean) => void;
}

export const useHostBrandingStore = create<HostBrandingState>((set) => ({
  hostWorkspace: null,
  resolved: false,
  setHostWorkspace: (hostWorkspace) => set({ hostWorkspace, resolved: true }),
  setResolved: (resolved) => set({ resolved }),
}));

const PLATFORM_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "app.trackfiz.com",
  "www.trackfiz.com",
  "trackfiz.com",
  "dev.trackfiz.com",
  "staging.trackfiz.com",
]);

export function isPlatformHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];
  if (PLATFORM_HOSTS.has(host)) return true;
  if (host.endsWith(".trackfiz.com")) return true;
  return false;
}

export function getPublicAppBaseUrl(opts?: {
  domain?: string | null;
  slug?: string | null;
}): string {
  if (typeof window !== "undefined" && !isPlatformHostname(window.location.hostname)) {
    return window.location.origin;
  }
  if (opts?.domain) {
    const host = opts.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return `https://${host}`;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://app.trackfiz.com";
}
