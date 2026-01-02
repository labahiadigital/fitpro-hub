import { createTheme, type MantineColorsTuple } from "@mantine/core";

// TrackFiz Professional SaaS Color Palette
// Primary/Accent (Highlights, CTAs): #E7E247 (Bright Yellow)
// Dark Background/Text (Sidebar, Headlines): #3D3B30 (Dark Olive/Black)
// Secondary Text/UI Elements: #4D5061 (Slate Grey)
// Primary Brand Color (Charts, Active States): #5C80BC (Muted Blue)
// Page Background/Card Backgrounds: #E9EDDE (Off-white/Beige) and Pure White

// Primary Brand Color - Muted Blue (#5C80BC)
const primary: MantineColorsTuple = [
  "#f0f4fa",
  "#dbe4f2",
  "#b8cbe6",
  "#92b0d9",
  "#7199ce",
  "#5C80BC",
  "#4a6ca8",
  "#3d5a8f",
  "#314976",
  "#25385d",
];

// Accent Color - Bright Yellow (#E7E247)
const accent: MantineColorsTuple = [
  "#fefef5",
  "#fcfce6",
  "#f7f7c4",
  "#f1f19f",
  "#ebeb7a",
  "#E7E247",
  "#d4cf2e",
  "#b5b11f",
  "#969315",
  "#77750c",
];

// Dark Olive for dark elements (#3D3B30)
const dark: MantineColorsTuple = [
  "#f5f5f4",
  "#e6e6e3",
  "#c9c9c3",
  "#ababa1",
  "#8d8d81",
  "#6f6f62",
  "#5a5a4e",
  "#4d4d42",
  "#3D3B30",
  "#2d2b23",
];

// Slate Grey for secondary elements (#4D5061)
const slate: MantineColorsTuple = [
  "#f4f5f7",
  "#e4e6eb",
  "#c5c9d4",
  "#a5abbe",
  "#868ea7",
  "#6b7491",
  "#5a6280",
  "#4D5061",
  "#3f4250",
  "#31343f",
];

// Success Green
const success: MantineColorsTuple = [
  "#ecfdf5",
  "#d1fae5",
  "#a7f3d0",
  "#6ee7b7",
  "#34d399",
  "#10b981",
  "#059669",
  "#047857",
  "#065f46",
  "#064e3b",
];

// Error Red
const error: MantineColorsTuple = [
  "#fef2f2",
  "#fee2e2",
  "#fecaca",
  "#fca5a5",
  "#f87171",
  "#ef4444",
  "#dc2626",
  "#b91c1c",
  "#991b1b",
  "#7f1d1d",
];

export const theme = createTheme({
  primaryColor: "primary",
  colors: {
    primary,
    accent,
    dark,
    slate,
    success,
    error,
  },
  fontFamily:
    '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: "700",
  },
  defaultRadius: "md",
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          fontWeight: 600,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      },
    },
    Paper: {
      defaultProps: {
        radius: "lg",
      },
      styles: {
        root: {
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
      },
      styles: {
        root: {
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
    },
    MultiSelect: {
      defaultProps: {
        radius: "md",
      },
    },
    Textarea: {
      defaultProps: {
        radius: "md",
      },
    },
    NumberInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
        centered: true,
      },
    },
    Notification: {
      defaultProps: {
        radius: "md",
      },
    },
    Badge: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          fontWeight: 600,
          textTransform: "none",
        },
      },
    },
  },
});

// CSS Variables for custom styling
export const cssVariables = {
  // Main Colors
  "--tf-accent": "#E7E247",
  "--tf-accent-hover": "#d4cf2e",
  "--tf-dark": "#3D3B30",
  "--tf-dark-light": "#4d4d42",
  "--tf-slate": "#4D5061",
  "--tf-primary": "#5C80BC",
  "--tf-primary-light": "#7199ce",
  "--tf-bg": "#E9EDDE",
  "--tf-bg-light": "#F5F7F0",
  "--tf-white": "#FFFFFF",
  
  // Semantic Colors
  "--tf-success": "#10b981",
  "--tf-warning": "#f59e0b",
  "--tf-error": "#ef4444",
  "--tf-info": "#5C80BC",
  
  // Shadows
  "--tf-shadow-sm": "0 1px 2px 0 rgba(61, 59, 48, 0.05)",
  "--tf-shadow": "0 1px 3px 0 rgba(61, 59, 48, 0.1), 0 1px 2px -1px rgba(61, 59, 48, 0.1)",
  "--tf-shadow-md": "0 4px 6px -1px rgba(61, 59, 48, 0.1), 0 2px 4px -2px rgba(61, 59, 48, 0.1)",
  "--tf-shadow-lg": "0 10px 15px -3px rgba(61, 59, 48, 0.1), 0 4px 6px -4px rgba(61, 59, 48, 0.1)",
  
  // Border Radius
  "--tf-radius-sm": "6px",
  "--tf-radius": "8px",
  "--tf-radius-md": "10px",
  "--tf-radius-lg": "12px",
  "--tf-radius-xl": "16px",
};
