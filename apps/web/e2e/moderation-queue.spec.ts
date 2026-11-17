import { signInAdmin } from "./admin-fixtures";
import { caseLabel, caseNumber, cleanupModeration, createCase, createMember, moderationTracked } from "./moderation-fixtures";
import { reportAudits } from "./peripherals-fixtures";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Warteschlange `/admin/moderation` (Schritt 1.13, v2 12.4): Reihenfolge nach
 * Priorität und Alter, Filter in der URL, «Nächster Fall» mit Taste N und die
 * alten Adressen unter `/admin/meldungen`. Fremde Fälle paralleler Tests
 * stehen mit in der Liste; geprüft werden nur die eigenen.
 */
const track = moderationTracked();
test.afterEach(async () => {
  await cleanupModeration(track);
});

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

test.describe("Warteschlange der Moderation", () => {
  test("ordnet nach Priorität, darin nach Alter, mit Fall-ID, Kategorie und Zuständigkeit", async ({ page, baseURL }) => {
    const reporter = await createMember(track);
    const target = await createMember(track);
    const base = { reporterId: reporter.id, targetType: "USER" as const, targetId: target.id };
    const lowOld = await createCase(track, { ...base, reason: "spam", priority: "LOW", createdAt: minutesAgo(600) });
    const normalNew = await createCase(track, { ...base, reason: "other", priority: "NORMAL", createdAt: minutesAgo(5) });
    const normalOld = await createCase(track, { ...base, reason: "other", priority: "NORMAL", createdAt: minutesAgo(120) });
    const high = await createCase(track, { ...base, reason: "scam", priority: "HIGH", createdAt: minutesAgo(1) });
    const critical = await createCase(track, { ...base, reason: "minor", priority: "CRITICAL", createdAt: minutesAgo(2) });
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    track.users.push(moderator.id);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/de/admin/moderation");
    await expect(page.getByRole("heading", { level: 1, name: "Moderation" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Bereiche des Admins" }).getByRole("link", { name: /^Moderation/ })).toHaveAttribute("aria-current", "page");
    const ours = [critical, high, normalOld, normalNew, lowOld];
    const table = page.getByRole("table");
    const order = await table.locator("[data-case-link]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-case-link")));
    expect(order.filter((id) => ours.includes(id ?? ""))).toEqual(ours);

    const criticalRow = table.getByRole("row").filter({ has: page.locator(`[data-case-link="${critical}"]`) });
    await expect(criticalRow).toContainText(caseLabel(await caseNumber(critical)));
    await expect(criticalRow).toContainText("Mitglied · Verdacht auf Minderjährige");
    await expect(criticalRow).toContainText("Kritisch · Trust & Safety");
    await expect(criticalRow).toContainText("Offen");
    await expect(criticalRow).toContainText("Niemand");
    await expect(criticalRow).toContainText("seit weniger als einer Stunde");
    await expectNoSeriousAxeFindings(page);
    // Die Liste öffnet keinen Fall und schreibt deshalb nichts ins Audit-Log.
    expect(await reportAudits(critical)).toEqual([]);

    // «Alter» kehrt nur die Reihenfolge innerhalb einer Priorität um.
    await table.getByRole("button", { name: /Alter/ }).click();
    await expect(page).toHaveURL(/richtung=ab/);
    await expect
      .poll(async () => (await table.locator("[data-case-link]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-case-link")))).filter((id) => ours.includes(id ?? "")))
      .toEqual([critical, high, normalNew, normalOld, lowOld]);

    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
  });

  test("Filter stehen in der URL; ohne Treffer gibt es «Filter zurücksetzen»", async ({ page, baseURL }) => {
    const reporter = await createMember(track);
    const target = await createMember(track);
    const high = await createCase(track, { reporterId: reporter.id, targetType: "USER", targetId: target.id, reason: "scam", priority: "HIGH", createdAt: minutesAgo(30) });
    const low = await createCase(track, { reporterId: reporter.id, targetType: "PROFILE", targetId: "e2e-unbekannt", reason: "spam", priority: "LOW", createdAt: minutesAgo(30) });
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    track.users.push(moderator.id);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto("/de/admin/moderation?prioritaet=hoch&art=mitglied");
    const table = page.getByRole("table");
    await expect(table.locator(`[data-case-link="${high}"]`)).toBeVisible();
    await expect(table.locator(`[data-case-link="${low}"]`)).toHaveCount(0);
    for (const cell of await table.locator("[data-priority]").all()) await expect(cell).toHaveAttribute("data-priority", "HIGH");

    await page.getByRole("combobox", { name: "Zuweisung" }).click();
    await page.getByRole("option", { name: "Mir zugewiesen" }).click();
    await expect(page).toHaveURL(/zuweisung=mir/);
    await expect(page).toHaveURL(/prioritaet=hoch/);
    await expect(page.getByText("Keine Fälle für diese Filter")).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    await page.getByRole("link", { name: "Filter zurücksetzen" }).click();
    await expect(page).toHaveURL(/\/de\/admin\/moderation$/);
    await expect(table.locator(`[data-case-link="${low}"]`)).toBeVisible();

    await page.goto("/de/admin/moderation?status=unsinn&prioritaet=niedrig");
    await expect(page.getByRole("combobox", { name: "Status" })).toContainText("Aktiv");
    await expect(table.locator(`[data-case-link="${low}"]`)).toBeVisible();
  });

  test("«Nächster Fall» mit Taste N öffnet den dringendsten, ältesten freien Fall", async ({ page, baseURL }) => {
    const reporter = await createMember(track);
    const target = await createMember(track);
    // Älter als jeder Fall anderer Tests: so ist er sicher der nächste für Trust & Safety.
    const oldest = await createCase(track, { reporterId: reporter.id, targetType: "USER", targetId: target.id, reason: "danger", priority: "CRITICAL", createdAt: new Date("2001-01-01T08:00:00Z") });
    const trustSafety = await signInAdmin(page, baseURL, "TRUST_SAFETY");
    track.users.push(trustSafety.id);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/de/admin/moderation");
    const next = page.getByRole("link", { name: "Nächsten Fall öffnen" });
    await expect(next).toHaveAttribute("aria-keyshortcuts", "n");
    await expect(page.getByText("öffnet den dringendsten, ältesten Fall, der frei oder dir zugewiesen ist.")).toBeVisible();

    await page.keyboard.press("n");
    await expect(page).toHaveURL(`/de/admin/moderation/${oldest}`);
    await expect(page.getByRole("heading", { level: 1, name: `Fall ${caseLabel(await caseNumber(oldest))} · Mitglied · Kritisch` })).toBeVisible();
  });

  test("alte Adressen unter /admin/meldungen leiten dauerhaft weiter", async ({ page, baseURL }) => {
    const reporter = await createMember(track);
    const id = await createCase(track, { reporterId: reporter.id, targetType: "USER", targetId: reporter.id, reason: "spam", priority: "LOW" });
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    track.users.push(moderator.id);

    const list = await page.request.get("/de/admin/meldungen?status=erledigt", { maxRedirects: 0 });
    expect(list.status()).toBe(308);
    expect(list.headers().location).toBe("/de/admin/moderation?status=erledigt");
    await page.goto(`/de/admin/meldungen/${id}`);
    await expect(page).toHaveURL(`/de/admin/moderation/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: /^Fall M-\d{4}-\d{5} · Mitglied · Niedrig$/ })).toBeVisible();
  });
});
