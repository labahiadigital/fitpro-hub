import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-mantine": [
            "@mantine/core",
            "@mantine/hooks",
            "@mantine/form",
            "@mantine/notifications",
            "@mantine/dates",
            "@mantine/charts",
            "@mantine/modals",
          ],
          "vendor-query": ["@tanstack/react-query", "@tanstack/react-table"],
          "vendor-icons": ["@tabler/icons-react"],
          "vendor-charts": ["recharts"],
          "vendor-dnd": ["@hello-pangea/dnd"],
          "vendor-pdf": ["jspdf", "jspdf-autotable"],
        },
      },
    },
  },
});
