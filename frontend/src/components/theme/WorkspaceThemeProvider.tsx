import { MantineProvider } from "@mantine/core";
import { useEffect, useMemo, type ReactNode } from "react";
import { useAuthStore } from "../../stores/auth";
import {
  applyWorkspaceCssVars,
  clearWorkspaceCssVars,
  createBrandedTheme,
} from "../../theme/workspaceBranding";

/**
 * Applies the active workspace branding (colors) to CSS variables and Mantine theme.
 * Falls back to Trackfiz defaults when there is no workspace session.
 */
export function WorkspaceThemeProvider({ children }: { children: ReactNode }) {
  const branding = useAuthStore((s) => s.currentWorkspace?.branding);

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
