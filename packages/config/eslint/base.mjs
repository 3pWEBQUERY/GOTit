import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Gemeinsame Regeln für alle Pakete (PRD Abschnitt 4).
 * Tiefe Importe in ein anderes Paket oder Modul sind verboten:
 * erlaubt ist nur `@app/<paket>` oder `@app/<paket>/<modul>` (dessen index.ts).
 */
export const deepImportPatterns = [
  { group: ["@app/*/src", "@app/*/src/**"], message: "Importiere über die exports des Pakets, nicht aus src/." },
  // Ausnahme: `<modul>/schemas` ist der browsertaugliche Einstieg (nur Zod, kein Servercode),
  // ebenso `search/query` (Suchparameter der URL, rein und ohne Datenbank) und
  // `search/indexer` (schmaler Einstieg für worker und cron, ohne Queue-Abhängigkeiten).
  { group: ["@app/core/*/**", "!@app/core/*/schemas", "!@app/core/*/variants", "!@app/core/search/query", "!@app/core/search/indexer"], message: "Module von core nur über ihr index.ts importieren (oder `<modul>/schemas`)." },
  { group: ["@app/ui/*/**", "!@app/ui/tokens/*.css", "!@app/ui/glass/*.css"], message: "UI nur über @app/ui importieren." },
];

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/.next/**", "**/.next-*/**", "**/dist/**", "**/generated/**", "**/next-env.d.ts", "**/test-results/**", "**/playwright-report/**"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.node } },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "max-lines": ["error", { max: 600, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 120, skipBlankLines: true, skipComments: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": "allow-with-description", "ts-expect-error": "allow-with-description", minimumDescriptionLength: 10 },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-restricted-imports": ["error", { patterns: deepImportPatterns }],
      "no-console": "error",
    },
  },
);
