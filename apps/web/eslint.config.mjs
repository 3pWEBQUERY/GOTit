import next from "@app/config/eslint/next";

export default [
  ...next,
  {
    // Eine page.tsx setzt nur zusammen (PRD 15): Daten laden, Abschnitte, Metadaten.
    files: ["app/**/page.tsx"],
    rules: { "max-lines": ["error", { max: 80, skipBlankLines: true, skipComments: true }] },
  },
  {
    // Playwright-Fixtures heissen `use`; das ist kein React-Hook.
    files: ["e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  {
    settings: { next: { rootDir: import.meta.dirname } },
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
];
