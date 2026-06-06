import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import react from "eslint-plugin-react";
import sonarjs from "eslint-plugin-sonarjs";

export default [
  // Ignore patterns
  {
    ignores: [
      "dist/**",
      "**/dist/**",
      "node_modules/**",
      "build/**",
      "*.config.js",
      "tools/**",
      "archive/**",
      "scripts/**",
      "public/**",
      ".venv/**",
      "**/.venv/**",
      ".claude/**",
      "antigravity-mcp-server/**",
      "mcp_wrapper.js",
      "mcp_wrapper.cjs",
      "temp_*/**",
    ],
  },

  // Main configuration for JS/JSX files
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        __GIT_COMMIT__: "readonly", // Defined by Vite at build time
        __APP_VERSION__: "readonly", // Defined by Vite at build time
        __BUILD_TIME__: "readonly", // Defined by Vite at build time
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      sonarjs,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // ESLint recommended
      ...js.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,

      // React rules (relaxed for productivity)
      "react/react-in-jsx-scope": "off", // Not needed in React 17+
      "react/prop-types": "off", // We're not using PropTypes
      "react/jsx-no-target-blank": "warn",
      "react/jsx-uses-vars": "error", // Mark JSX components as used
      "react/jsx-uses-react": "error", // Mark React as used (for class components)

      // React Hooks (important for correctness)
      ...reactHooks.configs.recommended.rules,

      // React Refresh
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // === CODE QUALITY GUARDRAILS ===

      // Magic Numbers: DISABLED - too noisy for this codebase
      // Many legitimate uses like array indexes, durations, percentages
      // TODO: Re-enable when constants.js is comprehensive
      "no-magic-numbers": "off",

      // God Functions: DISABLED - codebase is stable, these are noise
      // TODO: Re-enable when doing major refactoring work
      complexity: "off",
      "max-lines-per-function": "off",

      // Cognitive Complexity (SonarJS): DISABLED
      "sonarjs/cognitive-complexity": "off",

      // General rules (relaxed)
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": "off", // Allow console for debugging
      "prefer-const": "warn",
      "no-var": "error",
    },
  },

  // Test files configuration
  {
    files: [
      "**/*.test.{js,jsx}",
      "**/*.spec.{js,jsx}",
      "**/__tests__/**/*.{js,jsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      // Test assertions naturally use literal numbers for expected values
      "no-magic-numbers": "off",
      // Allow long test files
      "max-lines-per-function": "off",
    },
  },

  // Firebase Cloud Functions (Node.js CommonJS)
  {
    files: ["functions/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Disable React-specific rules for Node.js files
      "react-refresh/only-export-components": "off",
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
