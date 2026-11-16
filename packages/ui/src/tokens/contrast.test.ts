import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

type Mode = "light" | "dark";
const css = readFileSync(join(import.meta.dirname, "color.css"), "utf8");

function token(name: string, mode: Mode): string {
  const match = new RegExp(`--${name}:\\s*light-dark\\((#[0-9a-f]{6}),\\s*(#[0-9a-f]{6})\\)`, "i").exec(css);
  if (!match?.[1] || !match[2]) throw new Error(`Token --${name} fehlt in color.css`);
  return mode === "light" ? match[1] : match[2];
}

const backgrounds = ["bg", "surface", "surface-2"];
const textTokens = ["ink", "ink-muted", "accent", "error", "warning", "success", "info"];

describe.each<Mode>(["light", "dark"])("Kontrast der Tokens im Modus %s (PRD 5.1)", (mode) => {
  it.each(textTokens.flatMap((text) => backgrounds.map((background) => [text, background] as const)))(
    "Text --%s auf --%s erreicht 4,5 : 1",
    (text, background) => {
      expect(contrastRatio(token(text, mode), token(background, mode))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("Text auf Akzent erreicht 4,5 : 1", () => {
    expect(contrastRatio(token("on-accent", mode), token("accent", mode))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(backgrounds)("Rand von Bedienelementen auf --%s erreicht 3 : 1", (background) => {
    expect(contrastRatio(token("border-strong", mode), token(background, mode))).toBeGreaterThanOrEqual(3);
  });
});

describe("Kontrastberechnung", () => {
  it("stimmt mit den Angaben der PRD überein", () => {
    expect(contrastRatio("#1a1816", "#faf8f5")).toBeCloseTo(16.7, 0);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });
});
