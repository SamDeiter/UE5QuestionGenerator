import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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
  plugins: [react()],
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

          // UI Components (~150 KB)
          "ui-components": [
            "./src/components/QuestionItem.jsx",
            "./src/components/QuestionList.jsx",
            "./src/components/ViewRouter.jsx",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Modern apps often exceed 500kb in vendor chunks
  },
});
