import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      // Existing client pages intentionally hydrate browser-only state in effects.
      "react-hooks/set-state-in-effect": "off",
      // Load functions are stable within each render and only run from mount effects.
      "react-hooks/immutability": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/workbox-*.js",
    "public/worker-*.js",
  ]),
]);
