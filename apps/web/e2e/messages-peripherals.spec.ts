import { createAccount, signInAdmin, signInAs, enableTwoFactor } from "./admin-fixtures";
import {
  addMessage,
  block,
  blockCount,
  cleanupPeripherals,
  createConversation,
  createMember,
  createProvider,
  createReport,
  markRead,
  reportAudits,
  tracked,
} from "./peripherals-fixtures";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Rund um den Messenger (Schritt 1.8, Entscheid 0014): «Blockiert» in den
 * Einstellungen, ungelesene Unterhaltungen auf `/ich`, Zahlen in Kopfzeile,
 * Tab-Leiste und Studio sowie die Übergabe an die Moderation (v1 20.4).
 * Alle Konten sind frisch und fiktiv, damit Zahlen nicht von anderen Tests abhängen.
 */
const track = tracked();
test.afterEach(async () => {
  await cleanupPeripherals(track);
});

test.describe("Blockiert unter Privatsphäre (v1 FR-CHAT-002)", () => {
  test("listet Blockierte; Aufheben entfernt die Zeile, «Rückgängig» blockiert wieder", async ({ page, baseURL }) => {
    const member = await createMember(track);
    const provider = await createProvider(track, "Blockprofil");
    const withoutConversation = await createProvider(track, "Ohneunterhaltung");
    await createConversation(track, member, provider);
    await block(member.id, provider.id);
    await block(member.id, withoutConversation.id);
    await signInAs(page, member, baseURL);

    await page.goto("/de/einstellungen/privatsphaere");
    const list = page.getByRole("list", { name: "Blockierte Personen" });
    const row = list.getByRole("listitem").filter({ hasText: provider.displayName });
    await expect(row).toContainText(/Blockiert am \d{2}\.\d{2}\.\d{4}/);
    const orphan = list.getByRole("listitem").filter({ hasText: withoutConversation.displayName });
    await expect(orphan).toBeVisible();
    await expect(orphan.getByRole("button")).toHaveCount(0);
    await expectNoSeriousAxeFindings(page);

    await row.getByRole("button", { name: `Blockierung aufheben für ${provider.displayName}` }).click();
    await expect(page.getByText(`Blockierung für ${provider.displayName} aufgehoben`, { exact: true })).toBeVisible();
    await expect(list.getByRole("listitem").filter({ hasText: provider.displayName })).toHaveCount(0);
    expect(await blockCount(member.id, provider.id)).toBe(0);

    await page.getByRole("button", { name: "Rückgängig" }).click();
    await expect(page.getByText(`${provider.displayName} ist wieder blockiert`, { exact: true })).toBeVisible();
    await expect(list.getByRole("listitem").filter({ hasText: provider.displayName })).toBeVisible();
    expect(await blockCount(member.id, provider.id)).toBe(1);

    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
  });

  test("ein Mitglied ohne Benutzernamen erscheint als «Mitglied»; leer zeigt einen Satz", async ({ page, baseURL }) => {
    const member = await createMember(track);
    const provider = await createProvider(track, "Anbieterblock");
    await createConversation(track, member, provider);
    await block(provider.id, member.id);
    await signInAs(page, provider, baseURL);
    await page.goto("/de/einstellungen/privatsphaere");
    const row = page.getByRole("list", { name: "Blockierte Personen" }).getByRole("listitem");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Mitglied");
    await expect(row).not.toContainText("Registrierter Name");
    await row.getByRole("button", { name: "Blockierung aufheben für Mitglied" }).click();
    await expect(page.getByText("Niemand blockiert")).toBeVisible();
    await expectNoSeriousAxeFindings(page);
  });
});

test.describe("Ungelesen auf /ich und als Zahl in der Shell", () => {
  test("/ich nennt ungelesene Unterhaltungen mit Link, für Anbieter ins Studio", async ({ page, baseURL }) => {
    const member = await createMember(track, `peri_${Date.now()}`.slice(0, 20));
    const provider = await createProvider(track, "Ungelesenprofil");
    const readProvider = await createProvider(track, "Gelesenprofil");
    const unread = await createConversation(track, member, provider);
    const read = await createConversation(track, member, readProvider);
    await addMessage(unread, provider.id, "Fiktive Antwort eins", 90);
    await addMessage(unread, provider.id, "Fiktive Antwort zwei", 60);
    await addMessage(read, readProvider.id, "Schon gelesen", 30);
    await markRead(read, member.id);

    await signInAs(page, member, baseURL);
    await page.goto("/de/ich");
    const section = page.getByRole("region", { name: "Ungelesene Unterhaltungen" });
    const link = section.getByRole("link", { name: new RegExp(provider.displayName) });
    await expect(link).toHaveAttribute("href", `/de/nachrichten/${unread}`);
    await expect(link).toContainText("2 neue Nachrichten");
    await expect(link.locator("time")).toHaveAttribute("title", /\d{2}\.\d{2}\.\d{4}/);
    await expect(section).not.toContainText(readProvider.displayName);
    await expect(section).not.toContainText("Fiktive Antwort");
    await expect(section.getByRole("link", { name: "Alle Nachrichten öffnen" })).toHaveAttribute("href", "/de/nachrichten");
    await expectNoSeriousAxeFindings(page);

    await addMessage(unread, member.id, "Rückfrage", 10);
    await signInAs(page, provider, baseURL);
    await page.goto("/de/ich");
    const studioLink = page.getByRole("region", { name: "Ungelesene Unterhaltungen" }).getByRole("link", { name: new RegExp(`peri_`) });
    await expect(studioLink).toHaveAttribute("href", `/de/studio/nachrichten/${unread}`);
    await expect(studioLink).toContainText("1 neue Nachricht im Studio");
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
  });

  test("Kopfzeile und Tab-Leiste zählen die Mitgliederseite, das Studio die Anbieterseite", async ({ page, baseURL }) => {
    const member = await createMember(track);
    const first = await createProvider(track, "Zaehlprofil");
    const second = await createProvider(track, "Zweitprofil");
    const a = await createConversation(track, member, first);
    const b = await createConversation(track, member, second);
    await addMessage(a, first.id, "Fiktiv eins");
    await addMessage(b, second.id, "Fiktiv zwei");
    await addMessage(a, member.id, "Fiktive Frage");

    await page.setViewportSize({ width: 1280, height: 800 });
    await signInAs(page, member, baseURL);
    await page.goto("/de/ich");
    const header = page.locator("[data-app-header]");
    await expect(header.getByRole("link", { name: "Nachrichten, 2 ungelesen", exact: true })).toHaveAttribute("href", "/de/nachrichten");
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    const tabs = page.getByRole("navigation", { name: "Bereiche" });
    await expect(tabs.getByRole("link", { name: "Nachrichten, 2 ungelesen", exact: true })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);

    // Dasselbe Konto als Anbieter: nur die eine Unterhaltung, in der jemand ihm geschrieben hat.
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInAs(page, first, baseURL);
    await page.goto("/de/studio");
    await expect(header.getByRole("link", { name: "Nachrichten", exact: true })).toBeVisible();
    const sidebar = page.locator("[data-studio-sidebar]");
    await expect(sidebar.getByRole("link", { name: "Nachrichten, 1 ungelesen", exact: true })).toHaveAttribute("href", "/de/studio/nachrichten");
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await expect(tabs.getByRole("link", { name: "Nachrichten, 1 ungelesen", exact: true })).toHaveAttribute("href", "/de/studio/nachrichten");
    await expectNoHorizontalScroll(page);

    await markRead(a, first.id);
    await page.reload();
    await expect(tabs.getByRole("link", { name: "Nachrichten", exact: true })).toBeVisible();
  });
});

test.describe("Meldungen in der Moderation (v1 20.4, v2 12.4)", () => {
  test("Moderation sieht dringende zuerst, den Fall mit verdeckter Kopie und hinterlässt Audit-Einträge", async ({ page, baseURL }) => {
    const reporter = await createMember(track, `melder_${Date.now()}`.slice(0, 20));
    const reported = await createMember(track);
    const secret = `Fiktiver privater Inhalt ${Date.now()}`;
    const oldNormal = await createReport(track, { reporterId: reporter.id, targetId: reported.id, reason: "spam", urgent: false, minutesAgo: 300 });
    const newUrgent = await createReport(track, {
      reporterId: reporter.id,
      targetId: reported.id,
      reason: "minor",
      urgent: true,
      minutesAgo: 5,
      details: "Fiktiver Meldetext",
      messages: [secret, "Zweite fiktive Nachricht"],
    });
    const newNormal = await createReport(track, { reporterId: reporter.id, targetId: reported.id, reason: "harassment", urgent: false, minutesAgo: 10 });
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    track.users.push(moderator.id);

    await page.goto("/de/admin/moderation");
    await expect(page.getByRole("heading", { level: 1, name: "Moderation" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Bereiche des Admins" });
    await expect(nav.getByRole("link", { name: /^Moderation/ })).toHaveAttribute("aria-current", "page");
    const ours = [newUrgent, oldNormal, newNormal];
    // Tabelle und Karten (unter 768 px) stehen beide im DOM; jede Meldung zählt einmal.
    const links = await page.locator("[data-case-link]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-case-link")));
    const order = [...new Set(links)].filter((id) => ours.includes(id ?? ""));
    expect(order).toEqual([newUrgent, oldNormal, newNormal]);
    const urgentRow = page.getByRole("table").getByRole("row").filter({ has: page.locator(`[data-case-link="${newUrgent}"]`) });
    await expect(urgentRow).toContainText("Kritisch · Trust & Safety");
    await expect(urgentRow).toContainText("Verdacht auf Minderjährige");
    await expect(urgentRow).toContainText("seit weniger als einer Stunde");
    await expectNoSeriousAxeFindings(page);
    expect(await reportAudits(newUrgent)).toEqual([]);

    await page.getByRole("table").locator(`[data-case-link="${newUrgent}"]`).click();
    await expect(page.getByRole("heading", { level: 1, name: /^Fall M-\d{4}-\d{5} · Mitglied · Kritisch$/ })).toBeVisible();
    await expect(page.getByText("Fiktiver Meldetext")).toBeVisible();
    await expect(page.getByText("Entscheidet Trust & Safety")).toBeVisible();
    await expect(page.locator("[data-evidence=hidden]")).toContainText("Die Kopie von 2 Nachrichten ist verdeckt.");
    expect(await page.content()).not.toContain(secret);
    expect(await page.content()).not.toContain("Registrierter Name");
    await expectNoSeriousAxeFindings(page);
    expect(await reportAudits(newUrgent)).toEqual([{ actorId: moderator.id, action: "report.viewed", reason: null }]);

    await page.getByRole("button", { name: "Nachrichten aufdecken" }).click();
    await expect(page.getByText("Gib einen Grund mit mindestens 10 Zeichen an.")).toBeVisible();
    await page.getByLabel("Grund für das Aufdecken").fill("Prüfung der gemeldeten Nachrichten");
    await page.getByRole("button", { name: "Nachrichten aufdecken" }).click();
    await expect(page.getByText(secret)).toBeVisible();
    expect(await reportAudits(newUrgent)).toEqual([
      { actorId: moderator.id, action: "report.viewed", reason: null },
      { actorId: moderator.id, action: "report.evidence_revealed", reason: "Prüfung der gemeldeten Nachrichten" },
    ]);
    await page.getByRole("button", { name: "Wieder verdecken" }).click();
    await expect(page.getByText(secret)).toHaveCount(0);
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);

    const unknown = await page.goto("/de/admin/moderation/unbekannt");
    expect(unknown?.status()).toBe(404);
  });

  test("Support sieht den Hinweis statt Meldungen; ein Mitglied bekommt eine 404", async ({ page, baseURL }) => {
    const reporter = await createMember(track);
    const reportId = await createReport(track, { reporterId: reporter.id, targetId: reporter.id, reason: "scam", urgent: false, minutesAgo: 20, messages: ["Geheim fiktiv"] });
    const support = await signInAdmin(page, baseURL, "SUPPORT");
    track.users.push(support.id);
    for (const path of ["/de/admin/moderation", `/de/admin/moderation/${reportId}`]) {
      await page.goto(path);
      await expect(page.getByText("Fälle enthalten private Nachrichten.")).toBeVisible();
      await expect(page.getByRole("table")).toHaveCount(0);
      await expect(page.getByText("Geheim fiktiv")).toHaveCount(0);
    }
    await expectNoSeriousAxeFindings(page);
    expect(await reportAudits(reportId)).toEqual([]);

    const member = await createMember(track);
    await signInAs(page, member, baseURL);
    const response = await page.goto("/de/admin/moderation");
    expect(response?.status()).toBe(404);
  });

  test("die Server Action verweigert Support das Aufdecken", async ({ page, baseURL }) => {
    const reporter = await createMember(track);
    const reportId = await createReport(track, { reporterId: reporter.id, targetId: reporter.id, reason: "spam", urgent: false, minutesAgo: 20, messages: ["Geheim fiktiv"] });
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    const support = await createAccount("SUPPORT");
    track.users.push(moderator.id, support.id);
    await page.goto(`/de/admin/moderation/${reportId}`);
    await page.getByLabel("Grund für das Aufdecken").fill("Fiktiver Grund für den Test");

    // Dieselbe geladene Seite, jetzt mit der Sitzung von Support: die Aktion prüft selbst.
    await signInAs(page, support, baseURL);
    await enableTwoFactor(page, baseURL);
    await page.getByRole("button", { name: "Nachrichten aufdecken" }).click();
    await expect(page.getByText("Deine Rolle darf keine Meldungen einsehen. Es wurde nichts aufgedeckt.")).toBeVisible();
    await expect(page.getByText("Geheim fiktiv")).toHaveCount(0);
    expect((await reportAudits(reportId)).map((entry) => entry.action)).toEqual(["report.viewed"]);
  });
});
