import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from "vite-plugin-compression";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

// Read package.json version
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "./package.json"), "utf-8")
);
const APP_VERSION = packageJson.version;

// Get git commit hash for version tracking
const getGitCommitHash = () => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
};

// Base path differs by host: "/" for Firebase Hosting (served at the root
// domain — current default). Set VITE_BASE_PATH="/UE5QuestionGenerator/" at
// build time only for the legacy GitHub Pages subpath deploy.
const BASE_PATH = process.env.VITE_BASE_PATH || "/";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // PERFORMANCE: Gzip compression for smaller transfers
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024, // Only compress files > 1KB
    }),

    // PERFORMANCE: Brotli compression (even better than gzip)
    viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
    }),

    // PERFORMANCE: Service Worker for offline support and caching
    VitePWA({
      // Use "prompt" so the app gets onNeedRefresh() and can show an
      // "update available" banner. The banner's Reload button calls
      // updateSW(true), which triggers skipWaiting + reload.
      registerType: "prompt",
      // We register the SW manually from src/main.jsx via virtual:pwa-register
      // so we can wire up the onNeedRefresh callback.
      injectRegister: false,
      workbox: {
        // Do NOT set skipWaiting — that would auto-activate the new SW behind
        // the user's back and bypass the update prompt.
        // clientsClaim IS safe in prompt mode: it only runs after the SW
        // activates, which only happens after the user clicks Reload (and we
        // post SKIP_WAITING). Without it, controllerchange never fires on
        // existing tabs and the auto-reload in vite-plugin-pwa's register
        // helper silently no-ops — which was the "Reload button does nothing"
        // bug.
        clientsClaim: true,
        // Cache all static assets aggressively
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Cache Firestore API responses (NOT auth — caching auth tokens causes stale-session issues)
            urlPattern:
              /^https:\/\/firestore\.googleapis\.com/,
            handler: "NetworkFirst",
            options: {
              cacheName: "firebase-firestore-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache images with stale-while-revalidate
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      includeAssets: ["logos/*.svg", "logos/*.png"],
      manifest: {
        name: "UE5 Question Generator",
        short_name: "UE5 Questions",
        description:
          "AI-powered question generation for Unreal Engine 5 educational content",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        start_url: BASE_PATH,
        scope: BASE_PATH,
        icons: [
          {
            src: "logos/UE-Icon-2023-White.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  base: BASE_PATH,
  define: {
    __GIT_COMMIT__: JSON.stringify(getGitCommitHash()),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    headers: {
      // Allow Firebase Auth popups to communicate with the main window
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    css: true,
    // Exclude Claude Code agent worktrees: they are full repo copies under
    // .claude/worktrees, so without this vitest discovers and runs every test
    // 1-per-worktree, inflating/duplicating results locally (harmless in CI,
    // which is a fresh checkout). Keep vitest's defaults (node_modules, dist, …).
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
  esbuild: {
    drop: ["console", "debugger"],
  },
  build: {
    // Enable source maps for debugging (won't affect load time)
    sourcemap: false,
    // Minify aggressively
    minify: "esbuild",
    // Target modern browsers for smaller bundles
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React vendor chunk — includes React core + packages that
          // use React.forwardRef/createElement at module init time.
          // react-smooth and react-transition-group are recharts deps
          // that crash if React isn't resolved in the same chunk.
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler") ||
            id.includes("node_modules/react-is") ||
            id.includes("node_modules/react-smooth") ||
            id.includes("node_modules/react-transition-group") ||
            id.includes("node_modules/react-redux") ||
            id.includes("node_modules/use-sync-external-store")
          ) {
            return "vendor-react";
          }

          // Firebase Auth chunk
          if (id.includes("node_modules/@firebase/auth") || id.includes("node_modules/firebase/auth")) {
            return "vendor-firebase-auth";
          }

          // Firebase Firestore chunk
          if (id.includes("node_modules/@firebase/firestore") || id.includes("node_modules/firebase/firestore")) {
            return "vendor-firebase-firestore";
          }

          // Rest of Firebase
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase")) {
            return "vendor-firebase-core";
          }

          // NOTE: recharts + d3 are NOT manually chunked here.
          // Recharts v3 calls React.forwardRef at module init time,
          // and splitting it from React breaks the import resolution.

          // Icons vendor chunk
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }

          // Export utilities (jszip)
          if (id.includes("node_modules/jszip")) {
            return "vendor-export";
          }

          // Admin components grouping
          if (id.includes("src/components/AdminPanel") || 
              id.includes("src/components/InviteManagement") || 
              id.includes("src/components/UserList") ||
              id.includes("src/components/AuditLogs")) {
            return "view-admin";
          }

          // Analytics components grouping
          if (id.includes("src/components/Analytics") || id.includes("src/components/AnalyticsDashboard")) {
            return "view-analytics";
          }

          // Core UI logic
          if (id.includes("src/agents/")) {
            return "agents-logic";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Modern apps often exceed 500kb in vendor chunks
  },
});
