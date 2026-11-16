import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LOCALES } from "@app/core/locale";
import { describe, expect, it } from "vitest";
import { NAMESPACES } from "./namespaces";

const root = join(import.meta.dirname, "..", "messages");

function keys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key));
}

function load(locale: string, namespace: string): unknown {
  return JSON.parse(readFileSync(join(root, locale, `${namespace}.json`), "utf8"));
}

/** Abnahme der Oberfläche, Punkt 7: alle Texte in vier Sprachen vorhanden. */
describe("Übersetzungen", () => {
  it.each(LOCALES)("%s hat genau die registrierten Namensräume", (locale) => {
    expect(readdirSync(join(root, locale)).sort()).toEqual(NAMESPACES.map((name) => `${name}.json`).sort());
  });

  it.each(NAMESPACES.flatMap((namespace) => LOCALES.filter((locale) => locale !== "de").map((locale) => [namespace, locale] as const)))(
    "%s: %s hat dieselben Schlüssel wie de",
    (namespace, locale) => {
      expect(keys(load(locale, namespace)).sort()).toEqual(keys(load("de", namespace)).sort());
    },
  );

  it.each(NAMESPACES.flatMap((namespace) => LOCALES.map((locale) => [namespace, locale] as const)))(
    "%s/%s: keine leeren Texte und keine Ausrufezeichen",
    (namespace, locale) => {
      const flat = JSON.stringify(load(locale, namespace));
      expect(flat).not.toMatch(/:""/);
      expect(flat).not.toContain("!");
    },
  );
});
