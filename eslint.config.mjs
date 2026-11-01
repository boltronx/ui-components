import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import solid from "eslint-plugin-solid";
import globals from "globals";
import tseslint from "typescript-eslint";

// Each framework's rules apply only to its own package, docs and fixture.
const REACT_FILES = ["packages/react-ui/**", "apps/docs-react/**", "apps/next-fixture/**"];
const SOLID_FILES = ["packages/solid-ui/**", "apps/docs-solid/**", "apps/start-fixture/**"];

export default [
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/next-env.d.ts",
      "**/.vinxi/**",
      "**/.output/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      "simple-import-sort": simpleImportSort
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // Side effect imports (CSS) stay first so styling order doesn't break
            ["^\\u0000"],
            // Node.js built-ins
            ["^node:"],
            // Framework packages
            ["^react", "^react-dom", "^next", "^solid-js", "^@solidjs"],
            // Other packages
            ["^@?\\w"],
            // Parent imports
            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
            // Sibling imports
            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"]
          ]
        }
      ]
    }
  },
  {
    files: REACT_FILES,
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  },
  {
    ...solid.configs.recommended,
    files: SOLID_FILES
  },
  {
    files: SOLID_FILES,
    rules: {
      // These helpers call their callbacks from DOM events, where reading props is fine.
      "solid/reactivity": [
        "warn",
        { customReactiveFunctions: ["onFormReset", "keepControlledOnReset"] }
      ]
    }
  }
];
