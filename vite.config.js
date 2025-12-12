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
});
