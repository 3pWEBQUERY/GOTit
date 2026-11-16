import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";

const GROUPS = ["shell", "actions", "input", "search", "profile", "communication", "time", "data", "community", "feedback"] as const;

/** Abnahme 1.2: Jede Komponente zeigt ihre Zustände hell und dunkel; axe ohne schwere Befunde. */
for (const group of GROUPS) {
  for (const theme of ["light", "dark"] as const) {
    test(`Designsystem ${group} (${theme}): rendert ohne Fehler und besteht axe`, async ({ page, context }) => {
      await context.addCookies([{ name: "theme", value: theme, url: "http://localhost:3000" }]);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/de/dev/ui/${group}`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.getByRole("heading", { level: 2 }).count()).toBeGreaterThan(0);
      await expectNoSeriousAxeFindings(page);
      expect(errors).toEqual([]);
    });
  }

  test(`Designsystem ${group}: kein horizontales Scrollen bei 320 px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`/de/dev/ui/${group}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}
