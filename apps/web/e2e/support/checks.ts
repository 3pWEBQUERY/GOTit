import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Abnahme der Oberfläche, Punkt 4: keine axe-Befunde der Stufen «serious» und «critical». */
export async function expectNoSeriousAxeFindings(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const severe = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(severe.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
}

/** Abnahme der Oberfläche, Punkt 5: kein horizontales Scrollen. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "horizontaler Überlauf in px").toBeLessThanOrEqual(0);
}

export const WIDTHS = [320, 375, 768, 1024, 1280] as const;
