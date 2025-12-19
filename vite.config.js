import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";

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
  plugins: [react()],
  base: "/UE5QuestionGenerator/",
  define: {
    __GIT_COMMIT__: JSON.stringify(getGitCommitHash()),
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
            "firebase/analytics",
          ],

          // Charts vendor chunk (~200 KB) - only loaded in Analytics view
          "vendor-charts": ["recharts"],

          // Export utilities (~100 KB) - only loaded when exporting
          "vendor-export": ["jszip"],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Adjust threshold to avoid warnings for vendor chunks
  },
});
