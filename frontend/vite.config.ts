import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";
import { compression } from "vite-plugin-compression2";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  const plugins: PluginOption[] = [react()];

  if (isProd) {
    // Pre-compress build output so nginx can serve .gz / .br directly via
    // gzip_static/brotli_static without spending CPU on the fly. We skip
    // already-tiny files (<1kB) where compression overhead outweighs savings.
    plugins.push(
      compression({
        algorithm: "gzip",
        threshold: 1024,
        include: [/\.(js|css|html|svg|json|xml|txt|wasm)$/],
        deleteOriginalAssets: false,
      }) as PluginOption,
      compression({
        algorithm: "brotliCompress",
        threshold: 1024,
        include: [/\.(js|css|html|svg|json|xml|txt|wasm)$/],
        deleteOriginalAssets: false,
      }) as PluginOption,
    );
  }

  return {
    plugins,
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
    },
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    // OXC-level settings for dev + build (Vite 8 uses OXC instead of esbuild)
    oxc: {
      // Strip console.*/debugger in prod bundles
      drop: isProd ? ["console", "debugger"] : [],
      legalComments: "none",
    },
    css: {
      devSourcemap: !isProd,
    },
    build: {
      target: "es2022",
      cssCodeSplit: true,
      cssMinify: true,
      minify: "esbuild",
      sourcemap: isProd ? false : "inline",
      reportCompressedSize: false,
      chunkSizeWarningLimit: 900,
      // Tiny assets → base64 inlined (cuts a few extra HTTP requests)
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          // Hash-stable chunk naming so HTTP caching works properly
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;

            // React runtime + router together — always needed early
            if (/[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) {
              return "vendor-react";
            }
            if (id.includes("@mantine/charts") || id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("@mantine")) return "vendor-mantine";
            if (id.includes("@tanstack")) return "vendor-query";
            if (id.includes("@tabler/icons-react")) return "vendor-icons";
            if (id.includes("@hello-pangea/dnd")) return "vendor-dnd";
            if (id.includes("jspdf") || id.includes("jspdf-autotable")) {
              return "vendor-pdf";
            }
            if (id.includes("dayjs")) return "vendor-dayjs";
            if (id.includes("zustand") || id.includes("axios")) {
              return "vendor-core";
            }
            return "vendor";
          },
        },
      },
    },
    // Warm up the dep cache so first dev load is snappier
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@mantine/core",
        "@mantine/hooks",
        "@mantine/form",
        "@tanstack/react-query",
        "zustand",
        "axios",
        "dayjs",
      ],
    },
  };
});
