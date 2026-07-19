import { MantineProvider } from "@mantine/core";
import { useEffect, useMemo, type ReactNode } from "react";
import { useWhiteLabelBootstrap } from "../../hooks/useWhiteLabelBootstrap";
import { useAuthStore } from "../../stores/auth";
import { useHostBrandingStore } from "../../stores/hostBranding";
import {
  applyWorkspaceCssVars,
  clearWorkspaceCssVars,
  createBrandedTheme,
} from "../../theme/workspaceBranding";

/**
 * Applies the active workspace branding (colors) to CSS variables and Mantine theme.
 * Falls back to host-domain branding, then Trackfiz defaults.
 */
export function WorkspaceThemeProvider({ children }: { children: ReactNode }) {
  useWhiteLabelBootstrap();

  const sessionBranding = useAuthStore((s) => s.currentWorkspace?.branding);
  const hostBranding = useHostBrandingStore((s) => s.hostWorkspace?.branding);
  const branding = sessionBranding || hostBranding;

  const brandedTheme = useMemo(() => createBrandedTheme(branding), [branding]);

  useEffect(() => {
    if (branding) {
      applyWorkspaceCssVars(branding);
    } else {
      clearWorkspaceCssVars();
    }
    return () => {
      clearWorkspaceCssVars();
    };
  }, [branding]);

  return (
    <MantineProvider defaultColorScheme="light" theme={brandedTheme}>
      {children}
    </MantineProvider>
  );
}
