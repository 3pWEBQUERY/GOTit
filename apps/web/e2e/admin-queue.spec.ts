import { cleanup, createReviewCase, query, signInAdmin } from "./admin-fixtures";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/** Prüfwarteschlange und Übersicht (PRD 7.8, 12.4): Alter, Sortierung in der URL, Kürzel «Nächster Fall». */
const created: string[] = [];
test.afterEach(async () => {
  await cleanup(created.splice(0));
});

const DAY = 86_400_000;

test.describe("Prüfwarteschlange", () => {
  test("Fälle in Alters-Reihenfolge, Sortierung in der URL, «n» öffnet den ältesten", async ({ page, baseURL }) => {
    const reviewer = await signInAdmin(page, baseURL, "TRUST_SAFETY");
    created.push(reviewer.id);
    const now = Date.now();
    const cases = [
      await createReviewCase({ submittedAt: new Date(now - 5 * 3_600_000) }),
      await createReviewCase({ submittedAt: new Date(now - 3 * DAY - 3_600_000) }),
      await createReviewCase({ submittedAt: new Date(now - 2 * DAY - 3_600_000) }),
    ];
    created.push(...cases.map((entry) => entry.userId));
    const [newest, oldest, middle] = cases as [(typeof cases)[number], (typeof cases)[number], (typeof cases)[number]];

    await page.goto("/de/admin/verifizierungen");
    await expect(page.getByRole("heading", { level: 1, name: "Verifizierungen" })).toBeVisible();
    const table = page.getByRole("table", { name: "Offene Prüffälle" });
    await expect(table.getByRole("columnheader")).toHaveText(["Anzeigename", "Eingereicht am", "Alter", "Zuständig"]);
    const rowOf = (name: string) => table.getByRole("row").filter({ hasText: name });
    await expect(rowOf(oldest.displayName)).toContainText("seit 3 Tagen");
    await expect(rowOf(middle.displayName)).toContainText("seit 2 Tagen");
    await expect(rowOf(newest.displayName)).toContainText("seit 5 Stunden");
    await expect(rowOf(oldest.displayName)).toContainText("Niemand zugewiesen");
    await expect(rowOf(oldest.displayName).locator("time").last()).toHaveAttribute("title", /^\d{2}\.\d{2}\.\d{4}/);

    const order = async () => {
      const names = await table.locator("tbody tr").allInnerTexts();
      return [oldest, middle, newest].map((entry) => names.findIndex((text) => text.includes(entry.displayName)));
    };
    const ascending = await order();
    expect(ascending[0]).toBeLessThan(ascending[1] ?? -1);
    expect(ascending[1]).toBeLessThan(ascending[2] ?? -1);
    await expect(table.getByRole("columnheader", { name: "Eingereicht am" })).toHaveAttribute("aria-sort", "ascending");

    await table.getByRole("button", { name: "Eingereicht am" }).click();
    await expect(page).toHaveURL(/\?sortierung=eingereicht&richtung=ab$/);
    await expect(table.getByRole("columnheader", { name: "Eingereicht am" })).toHaveAttribute("aria-sort", "descending");
    await expect.poll(async () => {
      const [a, b, c] = await order();
      return (a ?? 0) > (b ?? 0) && (b ?? 0) > (c ?? 0);
    }).toBe(true);
    await expectNoSeriousAxeFindings(page);

    await page.goto("/de/admin/verifizierungen");
    await expect(page.getByText("öffnet den ältesten offenen Fall.")).toBeVisible();
    const expected = (await query<{ id: string }>(`select id from profile_review where decision is null order by "submittedAt" asc limit 1`))[0]?.id;
    await expect(page.getByRole("link", { name: "Nächsten Fall öffnen" })).toHaveAttribute("href", `/de/admin/verifizierungen/${expected}`);
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await expect(async () => {
      await page.keyboard.press("n");
      await expect(page).toHaveURL(new RegExp(`/de/admin/verifizierungen/${expected}$`), { timeout: 2000 });
    }).toPass();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Prüffall");
  });

  test("Übersicht zeigt die offenen Fälle mit Link zur Warteschlange; 320 px ohne Scrollen", async ({ page, baseURL }) => {
    const reviewer = await signInAdmin(page, baseURL, "PLATFORM_ADMIN");
    const review = await createReviewCase();
    created.push(reviewer.id, review.userId);
    await page.goto("/de/admin");
    await expect(page.getByRole("heading", { level: 2, name: "Offene Prüffälle" })).toBeVisible();
    await expect(page.locator("[data-open-count]")).toHaveText(/^[1-9]\d*$/);
    await expect(page.getByRole("navigation", { name: "Bereiche des Admins" }).getByRole("link", { name: /Verifizierungen/ })).toContainText(/\d/);
    await page.getByRole("link", { name: "Warteschlange öffnen" }).click();
    await expect(page).toHaveURL(/\/de\/admin\/verifizierungen$/);
    await expect(page.getByRole("navigation", { name: "Bereiche des Admins" }).getByRole("link", { name: /Verifizierungen/ })).toHaveAttribute("aria-current", "page");

    for (const path of ["/de/admin", "/de/admin/verifizierungen"]) {
      await page.setViewportSize({ width: 320, height: 720 });
      await page.goto(path);
      await expectNoHorizontalScroll(page);
      await expectNoSeriousAxeFindings(page);
    }
  });

  test("andere Sprachen: dieselben Pfade, übersetzte Texte", async ({ page, baseURL }) => {
    const reviewer = await signInAdmin(page, baseURL, "SUPER_ADMIN");
    created.push(reviewer.id);
    for (const [locale, title] of [["fr", "Vérifications"], ["it", "Verifiche"], ["en", "Verifications"]] as const) {
      await page.goto(`/${locale}/admin/verifizierungen`);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    }
  });
});
