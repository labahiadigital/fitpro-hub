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
      host: "127.0.0.1",
      port: 5173,
      // Fail fast if 5173 is taken instead of silently jumping to 5174.
      // Prevents HMR WebSocket mismatch (browser on :5174 trying to reach :5173).
      strictPort: true,
      // Explicit HMR config so the injected client connects to the same port
      // that Vite is actually listening on.
      hmr: {
        host: "127.0.0.1",
        port: 5173,
        protocol: "ws",
      },
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
      // Vite preloads every dependency of a lazy chunk reachable from the entry.
      // That's why `vendor-pdf` (~200 KB br) and `vendor-charts` (~100 KB br) end
      // up in modulepreload on `/login`, even though they are only needed when the
      // user clicks "Exportar PDF" or lands on a chart-heavy page. Strip those
      // heavy, feature-specific chunks from preload so the initial HTML only
      // warms the caches we actually use on first paint.
      modulePreload: {
        resolveDependencies: (_filename, deps) =>
          deps.filter(
            (dep) =>
              !dep.includes("vendor-pdf") &&
              !dep.includes("vendor-charts") &&
              !dep.includes("vendor-d3") &&
              !dep.includes("vendor-dnd") &&
              !dep.includes("vendor-mantine-dates"),
          ),
      },
      rollupOptions: {
        output: {
          // Hash-stable chunk naming so HTTP caching works properly
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;

            // React runtime + router together — always needed early
            if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
              return "vendor-react";
            }
            // d3 micro-packages pull ~300 KB through recharts — isolate them
            // so charts pages load them lazily without re-downloading on
            // every route change.
            if (/[\\/](d3-|internmap|victory-vendor)/.test(id)) {
              return "vendor-d3";
            }
            if (id.includes("recharts") || id.includes("@mantine/charts")) {
              return "vendor-charts";
            }
            // Split Mantine datepicker (~120 KB) away from the core so
            // pages without forms don't pay for it.
            if (id.includes("@mantine/dates")) return "vendor-mantine-dates";
            if (id.includes("@mantine")) return "vendor-mantine";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (id.includes("@tanstack/react-table")) return "vendor-table";
            if (id.includes("@tabler/icons-react")) return "vendor-icons";
            if (id.includes("@hello-pangea/dnd")) return "vendor-dnd";
            if (
              id.includes("jspdf") ||
              id.includes("html2canvas") ||
              id.includes("canvg") ||
              id.includes("dompurify") ||
              id.includes("fflate")
            ) {
              return "vendor-pdf";
            }
            if (id.includes("dayjs")) return "vendor-dayjs";
            if (id.includes("zustand") || id.includes("axios")) {
              return "vendor-core";
            }
            // Floating-ui + small UI utils cluster pulled by Mantine
            if (/[\\/](@floating-ui|react-remove-scroll|react-style-singleton|use-sidecar)[\\/]/.test(id)) {
              return "vendor-ui-utils";
            }
            return "vendor-misc";
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
