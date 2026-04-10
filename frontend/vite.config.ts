import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  build: {
    target: "es2022",
    reportCompressedSize: false,
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
        },
      },
    },
  },
}));
