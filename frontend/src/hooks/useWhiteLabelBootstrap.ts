import { useEffect } from "react";
import { api } from "../services/api";
import {
  getPublicAppBaseUrl,
  isPlatformHostname,
  useHostBrandingStore,
  type HostWorkspaceBranding,
} from "../stores/hostBranding";
import { useAuthStore } from "../stores/auth";
import { applyWorkspaceCssVars } from "../theme/workspaceBranding";

function setFavicon(href: string | null | undefined) {
  if (typeof document === "undefined") return;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href || "/favicon.svg";
}

function setDocumentBrand(name: string | null | undefined, logoUrl?: string | null) {
  if (typeof document === "undefined") return;
  document.title = name ? `${name}` : "Trackfiz";
  const apple = document.querySelector<HTMLMetaElement>("meta[name='apple-mobile-web-app-title']");
  if (apple) apple.content = name || "Trackfiz";
  const desc = document.querySelector<HTMLMetaElement>("meta[name='description']");
  if (desc && name) {
    desc.content = `${name} — plataforma de entrenamiento y bienestar`;
  }
  setFavicon(logoUrl);
}

/**
 * Resolves white-label branding for the current browser host and keeps
 * document title / favicon / CSS vars in sync with the active workspace.
 */
export function useWhiteLabelBootstrap() {
  const currentWorkspace = useAuthStore((s) => s.currentWorkspace);
  const hostWorkspace = useHostBrandingStore((s) => s.hostWorkspace);
  const setHostWorkspace = useHostBrandingStore((s) => s.setHostWorkspace);
  const setResolved = useHostBrandingStore((s) => s.setResolved);

  // Resolve custom domain → workspace (once per page load).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === "undefined") return;
      const hostname = window.location.hostname;
      if (isPlatformHostname(hostname)) {
        if (!cancelled) setResolved(true);
        return;
      }

      try {
        const res = await api.get(`/workspaces/by-domain/${encodeURIComponent(hostname)}`);
        if (cancelled) return;
        const data = res.data as HostWorkspaceBranding;
        setHostWorkspace(data);
        if (data.branding) applyWorkspaceCssVars(data.branding);
        setDocumentBrand(data.name, data.logo_url);
      } catch {
        if (!cancelled) {
          setHostWorkspace(null);
          setResolved(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setHostWorkspace, setResolved]);

  // Prefer authenticated workspace branding; fall back to host workspace.
  useEffect(() => {
    const active = currentWorkspace || hostWorkspace;
    if (!active) {
      if (isPlatformHostname(typeof window !== "undefined" ? window.location.hostname : "localhost")) {
        setDocumentBrand("Trackfiz", null);
      }
      return;
    }
    if (active.branding) {
      applyWorkspaceCssVars(active.branding);
    }
    setDocumentBrand(active.name, active.logo_url);
  }, [currentWorkspace, hostWorkspace]);
}

export function useBrandDisplayName(): string {
  const currentWorkspace = useAuthStore((s) => s.currentWorkspace);
  const hostWorkspace = useHostBrandingStore((s) => s.hostWorkspace);
  return currentWorkspace?.name || hostWorkspace?.name || "Trackfiz";
}

export function useBrandLogoUrl(): string | undefined {
  const currentWorkspace = useAuthStore((s) => s.currentWorkspace);
  const hostWorkspace = useHostBrandingStore((s) => s.hostWorkspace);
  return currentWorkspace?.logo_url || hostWorkspace?.logo_url || undefined;
}

export function useIsWhiteLabelHost(): boolean {
  if (typeof window === "undefined") return false;
  return !isPlatformHostname(window.location.hostname);
}

export { getPublicAppBaseUrl };
