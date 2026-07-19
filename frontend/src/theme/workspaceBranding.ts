import { createTheme, type MantineColorsTuple, type MantineThemeOverride } from "@mantine/core";
import { theme as baseTheme } from "./index";

export interface WorkspaceBrandingColors {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

export const DEFAULT_WORKSPACE_BRANDING: Required<WorkspaceBrandingColors> = {
  primary_color: "#5C80BC",
  secondary_color: "#4D5061",
  accent_color: "#E7E247",
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHexColor(value: string | undefined | null): value is string {
  return typeof value === "string" && HEX_RE.test(value.trim());
}

function normalizeHex(hex: string): string {
  const h = hex.trim().replace("#", "");
  if (h.length === 3) {
    return `#${h.split("").map((c) => c + c).join("")}`;
  }
  return `#${h}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function mix(hex: string, withColor: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(withColor);
  return rgbToHex(
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  );
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildColorTuple(base: string): MantineColorsTuple {
  const color = normalizeHex(base);
  return [
    mix(color, "#ffffff", 0.95),
    mix(color, "#ffffff", 0.85),
    mix(color, "#ffffff", 0.7),
    mix(color, "#ffffff", 0.5),
    mix(color, "#ffffff", 0.3),
    color,
    mix(color, "#000000", 0.15),
    mix(color, "#000000", 0.3),
    mix(color, "#000000", 0.45),
    mix(color, "#000000", 0.6),
  ] as MantineColorsTuple;
}

export function resolveBrandingColors(
  branding?: WorkspaceBrandingColors | null,
): Required<WorkspaceBrandingColors> {
  return {
    primary_color: isValidHexColor(branding?.primary_color)
      ? normalizeHex(branding.primary_color)
      : DEFAULT_WORKSPACE_BRANDING.primary_color,
    secondary_color: isValidHexColor(branding?.secondary_color)
      ? normalizeHex(branding.secondary_color)
      : DEFAULT_WORKSPACE_BRANDING.secondary_color,
    accent_color: isValidHexColor(branding?.accent_color)
      ? normalizeHex(branding.accent_color)
      : DEFAULT_WORKSPACE_BRANDING.accent_color,
  };
}

/** Applies workspace brand colors to CSS custom properties used across the app. */
export function applyWorkspaceCssVars(branding?: WorkspaceBrandingColors | null): void {
  if (typeof document === "undefined") return;

  const colors = resolveBrandingColors(branding);
  const root = document.documentElement;
  const primary = colors.primary_color;
  const accent = colors.accent_color;

  root.style.setProperty("--nv-primary", primary);
  root.style.setProperty("--nv-primary-dark", mix(primary, "#000000", 0.2));
  root.style.setProperty("--nv-primary-glow", withAlpha(primary, 0.15));
  root.style.setProperty("--nv-accent", accent);
  root.style.setProperty("--nv-accent-hover", mix(accent, "#000000", 0.1));
  root.style.setProperty("--nv-accent-glow", withAlpha(accent, 0.4));
  root.style.setProperty(
    "--shadow-glow",
    `0 0 20px ${withAlpha(accent, 0.2)}, 0 0 40px ${withAlpha(accent, 0.1)}`,
  );
  root.style.setProperty(
    "--shadow-glow-primary",
    `0 0 20px ${withAlpha(primary, 0.2)}, 0 0 40px ${withAlpha(primary, 0.1)}`,
  );
}

export function clearWorkspaceCssVars(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  [
    "--nv-primary",
    "--nv-primary-dark",
    "--nv-primary-glow",
    "--nv-accent",
    "--nv-accent-hover",
    "--nv-accent-glow",
    "--shadow-glow",
    "--shadow-glow-primary",
  ].forEach((prop) => root.style.removeProperty(prop));
}

export function createBrandedTheme(
  branding?: WorkspaceBrandingColors | null,
): MantineThemeOverride {
  const colors = resolveBrandingColors(branding);
  return createTheme({
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: buildColorTuple(colors.primary_color),
      accent: buildColorTuple(colors.accent_color),
      slate: buildColorTuple(colors.secondary_color),
    },
  });
}
