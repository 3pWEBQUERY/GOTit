import next from "@app/config/eslint/next";

export default [
  ...next,
  {
    // Eine page.tsx setzt nur zusammen (PRD 15): Daten laden, Abschnitte, Metadaten.
    files: ["app/**/page.tsx"],
    rules: { "max-lines": ["error", { max: 80, skipBlankLines: true, skipComments: true }] },
  },
  {
    settings: { next: { rootDir: import.meta.dirname } },
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
];
