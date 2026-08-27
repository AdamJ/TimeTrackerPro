import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "node:url";
import { VitePWA } from "vite-plugin-pwa";

const tauriDevHost = process.env.TAURI_DEV_HOST;
const projectRoot = fileURLToPath(new URL(".", import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: tauriDevHost ?? "::",
    port: 8080,
    strictPort: true,
    hmr: tauriDevHost
      ? {
          protocol: "ws",
          host: tauriDevHost,
          port: 8080
        }
      : undefined
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.svg",
        "favicon-96x96.png",
        "favicon.ico",
        "apple-touch-icon.png",
        "robots.txt",
        "print.css",
        "site.webmanifest"
      ],
      manifest: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 4000000,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 // 1 minute
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: "module"
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-recharts";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("/motion/") || id.includes("framer-motion")) return "vendor-motion";
          if (
            id.includes("react-markdown") ||
            id.includes("remark") ||
            id.includes("rehype") ||
            id.includes("mdast") ||
            id.includes("hast") ||
            id.includes("micromark") ||
            id.includes("unified") ||
            id.includes("vfile") ||
            id.includes("unist")
          ) return "vendor-markdown";
        }
      }
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/*.spec.ts"
    ],
    passWithNoTests: true
  }
});
