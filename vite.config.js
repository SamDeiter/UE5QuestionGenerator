import { defineConfig } from "vite";
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
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        // Cache all static assets aggressively
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Cache Firebase API responses (auth, firestore)
            urlPattern:
              /^https:\/\/(identitytoolkit|securetoken|firestore)\.googleapis\.com/,
            handler: "NetworkFirst",
            options: {
              cacheName: "firebase-api-cache",
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
        start_url: "/UE5QuestionGenerator/",
        scope: "/UE5QuestionGenerator/",
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
  base: "/UE5QuestionGenerator/",
  define: {
    __GIT_COMMIT__: JSON.stringify(getGitCommitHash()),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
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
        manualChunks: {
          // React vendor chunk (~150 KB)
          "vendor-react": ["react", "react-dom"],

          // Firebase vendor chunk (~300 KB)
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/functions",
          ],

          // Icons vendor chunk (~150 KB)
          "vendor-icons": ["lucide-react"],

          // Charts vendor chunk (~200 KB) - only loaded in Analytics view
          "vendor-charts": ["recharts"],

          // Export utilities (~100 KB) - only loaded when exporting
          "vendor-export": ["jszip"],

          // Agents and Logic (~100 KB)
          "agents-logic": [
            "./src/agents/index.js",
            "./src/agents/lockAgent.js",
            "./src/agents/auditAgent.js",
            "./src/agents/sessionAgent.js",
          ],

          // Portkey service (~15 KB) - only loaded when Portkey mode active
          "portkey-service": [
            "./src/services/portkey.js",
            "./src/services/portkeySecure.js",
          ],

          // Core UI - QuestionList only (QuestionItem loads naturally)
          "ui-core": ["./src/components/QuestionList.jsx"],

          // View Router - separate chunk for lazy loading
          "ui-router": ["./src/components/ViewRouter.jsx"],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Modern apps often exceed 500kb in vendor chunks
  },
});
