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
      "node_modules/**",
      "build/**",
      "*.config.js",
      "tools/**",
      "archive/**",
      "scripts/**",
      "public/**",
      ".venv/**",
      "**/.venv/**",
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

      // Magic Numbers: Avoid hardcoded values (except common 0, 1, -1)
      "no-magic-numbers": [
        "warn",
        {
          ignore: [0, 1, -1],
          ignoreArrayIndexes: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],

      // God Functions: Limit cyclomatic complexity
      complexity: ["warn", { max: 15 }],

      // God Functions: Limit function length
      "max-lines-per-function": [
        "warn",
        {
          max: 100,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],

      // Cognitive Complexity (SonarJS): Limit logic nesting
      "sonarjs/cognitive-complexity": ["warn", 20],

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
    files: ["**/*.test.{js,jsx}", "**/*.spec.{js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
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
