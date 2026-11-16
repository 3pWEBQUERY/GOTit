import next from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import react from "./react.mjs";

export default tseslint.config(...react, {
  files: ["**/*.{ts,tsx}"],
  plugins: { "@next/next": next },
  rules: {
    ...next.configs.recommended.rules,
    ...next.configs["core-web-vitals"].rules,
  },
});
