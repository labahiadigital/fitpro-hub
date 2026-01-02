import { createTheme, type MantineColorsTuple } from "@mantine/core";

// --- ATOMIC LUXURY PALETTE ---
// Obsidian: The Deepest Dark (Backgrounds)
// Gold: The Luxury Accent (Highlights)
// Mist: The Secondary Text (Subtle)
// Glass: The Surface (Panels)

// Primary Brand Color - Electric Gold (#E7E247) -> Refined to "Cyber Gold"
const primary: MantineColorsTuple = [
  "#fcfce6",
  "#f7f7c4",
  "#f1f19f",
  "#ebeb7a",
  "#e6e65c",
  "#E7E247", // MAIN
  "#d4cf2e",
  "#b5b11f",
  "#969315",
  "#77750c",
];

// Dark Scale - "Deep Space" (Rich Black/Blue)
const dark: MantineColorsTuple = [
  "#C1C2C5",
  "#A6A7AB",
  "#909296",
  "#5C5F66",
  "#373A40",
  "#2C2E33",
  "#25262B",
  "#1A1B1E",
  "#141517", // Surface
  "#101113", // Background
];

// Accent Color - Used for secondary actions
const accent: MantineColorsTuple = [
  "#eef3ff",
  "#dce4f5",
  "#b9c7e2",
  "#94a8d0",
  "#748dc1",
  "#5f7cb8",
  "#5474b4",
  "#44639f",
  "#39588f",
  "#2d4b81",
];

export const theme = createTheme({
  primaryColor: "primary",
  colors: {
    primary,
    dark,
    accent,
  },
  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily:
      '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: "600",
  },
  defaultRadius: "lg",
  components: {
    Button: {
      defaultProps: {
        radius: "xl", // Pill buttons by default
        size: "md",
      },
      styles: {
        root: {
          fontWeight: 600,
          border: "1px solid transparent",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(231, 226, 71, 0.15)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },
      },
    },
    Paper: {
      defaultProps: {
        radius: "xl",
      },
      styles: {
        root: {
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
        },
      },
    },
    Card: {
      defaultProps: {
        radius: "xl",
      },
      styles: {
        root: {
          backgroundColor: "rgba(37, 38, 43, 0.4)", // Translucent dark
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          transition: "all 0.3s ease",
          "&:hover": {
            backgroundColor: "rgba(37, 38, 43, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
        },
      },
    },
    Badge: {
      defaultProps: {
        radius: "sm",
        variant: "light",
      },
      styles: {
        root: {
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 700,
        },
      },
    },
    Modal: {
      defaultProps: {
        radius: "xl",
        overlayProps: {
          backgroundOpacity: 0.55,
          blur: 8,
        },
      },
      styles: {
        header: {
          backgroundColor: "transparent",
        },
        content: {
          backgroundColor: "#1A1B1E",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)",
        },
      },
    },
    Drawer: {
      styles: {
        content: {
          backgroundColor: "#1A1B1E",
        },
        header: {
          backgroundColor: "#1A1B1E",
        },
      },
    },
    Menu: {
      defaultProps: {
        radius: "lg",
      },
      styles: {
        dropdown: {
          backgroundColor: "rgba(26, 27, 30, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
        },
        item: {
          "&[data-hovered]": {
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          },
        },
      },
    },
  },
});
