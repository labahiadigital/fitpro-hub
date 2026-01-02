import { createTheme, type MantineColorsTuple } from "@mantine/core";

// --- PALETA NEXAVERSE (STRICT) ---
// Primary/Accent: #E7E247 (Bright Yellow)
// Dark Background/Text: #3D3B30 (Dark Olive/Black)
// Secondary Text/UI: #4D5061 (Slate Grey)
// Primary Brand: #5C80BC (Muted Blue)
// Backgrounds: #E9EDDE (Off-white/Beige) & White

const primaryBrand: MantineColorsTuple = [
  "#eef3ff",
  "#dce4f5",
  "#b9c7e2",
  "#94a8d0",
  "#748dc1",
  "#5f7cb8",
  "#5474b4",
  "#44639f",
  "#5C80BC", // Main Blue
  "#2d4b81",
];

const accentYellow: MantineColorsTuple = [
  "#fcfce6",
  "#f7f7c4",
  "#f1f19f",
  "#ebeb7a",
  "#e6e65c",
  "#E7E247", // Main Yellow
  "#d4cf2e",
  "#b5b11f",
  "#969315",
  "#77750c",
];

const darkOlive: MantineColorsTuple = [
  "#f4f4f3",
  "#e8e8e6",
  "#cfcfcc",
  "#b5b5b0",
  "#9f9f98",
  "#919189",
  "#8a8a81",
  "#76766d",
  "#696960",
  "#3D3B30", // Main Dark
];

export const theme = createTheme({
  primaryColor: "darkOlive", // Usamos el oscuro como primario para botones sólidos por defecto (mejor legibilidad con texto blanco/amarillo)
  colors: {
    primaryBrand,
    accentYellow,
    darkOlive,
  },
  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily:
      '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "3.5rem", lineHeight: "1.1" },
      h2: { fontSize: "2.5rem", lineHeight: "1.2" },
    },
  },
  defaultRadius: "lg",
  components: {
    Button: {
      defaultProps: {
        radius: "xl",
        size: "md",
      },
      styles: {
        root: {
          fontWeight: 600,
          border: "1px solid transparent",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "0 2px 4px rgba(61, 59, 48, 0.05)",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(61, 59, 48, 0.15)",
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
          backgroundColor: "#FFFFFF",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          border: "1px solid rgba(61, 59, 48, 0.05)",
        },
      },
    },
    Card: {
      defaultProps: {
        radius: "xl",
        padding: "xl",
      },
      styles: {
        root: {
          backgroundColor: "#FFFFFF",
          border: "1px solid rgba(61, 59, 48, 0.05)",
          boxShadow: "0 4px 6px -1px rgba(61, 59, 48, 0.02), 0 2px 4px -1px rgba(61, 59, 48, 0.02)",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 10px 15px -3px rgba(61, 59, 48, 0.08), 0 4px 6px -2px rgba(61, 59, 48, 0.04)",
          },
        },
      },
    },
    Badge: {
      defaultProps: {
        radius: "md",
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
  },
});
