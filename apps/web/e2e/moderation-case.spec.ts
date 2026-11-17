import { signInAdmin, signInAs } from "./admin-fixtures";
import {
  addMessageWithId,
  caseRow,
  cleanupModeration,
  createCase,
  createConversation,
  createMember,
  createMessageCase,
  createProvider,
  moderationTracked,
  restrictions,
  switchToAdmin,
} from "./moderation-fixtures";
import { reportAudits } from "./peripherals-fixtures";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Einzelfall `/admin/moderation/[fall]` (Schritt 1.13, v2 12.4): kritische
 * Fälle nur für Trust & Safety, Entscheid mit Regel und Begründung, die
 * Wirkung bei beiden Seiten einer Unterhaltung und eine Einschränkung, die
 * der Composer zeigt.
 */
const track = moderationTracked();
test.afterEach(async () => {
  await cleanupModeration(track);
});

test.describe("Fall der Moderation", () => {
  test("Moderation sieht einen kritischen Fall ohne Entscheid; Trust & Safety entscheidet", async ({ page, baseURL }) => {
    const reporter = await createMember(track);
    const target = await createMember(track);
    const id = await createCase(track, { reporterId: reporter.id, targetType: "USER", targetId: target.id, reason: "exploitation", priority: "CRITICAL", details: "Fiktiver Meldetext zum Test" });
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    track.users.push(moderator.id);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto(`/de/admin/moderation/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: /^Fall M-\d{4}-\d{5} · Mitglied · Kritisch$/ })).toBeVisible();
    await expect(page.getByText(/^An Trust & Safety eskaliert am \d{2}\.\d{2}\.\d{4}/)).toBeVisible();
    await expect(page.getByText("Fiktiver Meldetext zum Test")).toBeVisible();
    await expect(page.locator("[data-critical-note]")).toContainText("Kritische Fälle entscheidet nur Trust & Safety.");
    await expect(page.locator("[data-case-decision-form]")).toHaveCount(0);
    await expect(page.locator("[data-assign-controls]")).toHaveCount(0);
    await expect(page.getByText("Den Verlauf zu kritischen Fällen sieht nur Trust & Safety.")).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    const trustSafety = await switchToAdmin(page, baseURL, "TRUST_SAFETY");
    track.users.push(trustSafety.id);
    await page.goto(`/de/admin/moderation/${id}`);
    await page.getByRole("button", { name: "Mir zuweisen" }).click();
    await expect(page.locator("[data-case-assignee]")).toHaveText("Zuständig: Ich");
    expect(await caseRow(id)).toMatchObject({ status: "IN_REVIEW", assignedToId: trustSafety.id });

    const form = page.locator("[data-case-decision-form]");
    await form.getByRole("radio", { name: "Kein Verstoss" }).click();
    await expect(form.getByRole("combobox", { name: "Regel" })).toContainText("R-MOD-0 Kein Verstoss festgestellt");
    await form.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(form.getByText("Begründe mit mindestens 10 Zeichen.").first()).toBeVisible();
    await form.getByLabel("Begründung").fill("Fiktive Prüfung: kein Hinweis auf Ausbeutung.");
    await form.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(page.getByText("Entscheid gespeichert", { exact: true })).toBeVisible();
    expect(await caseRow(id)).toMatchObject({ status: "DISMISSED", decision: "NO_ACTION", rule: "R-MOD-0", decidedById: trustSafety.id });

    await page.goto(`/de/admin/moderation/${id}`);
    const summary = page.locator("[data-decision-summary]");
    await expect(summary).toContainText("Kein Verstoss");
    await expect(summary).toContainText("R-MOD-0 Kein Verstoss festgestellt");
    await expect(summary).toContainText("Fiktive Prüfung: kein Hinweis auf Ausbeutung.");
    await expect(summary).toContainText("Ich");
    const actions = (await reportAudits(id)).map((entry) => entry.action);
    expect(actions).toContain("report.assigned");
    expect(actions).toContain("report.decided.no_action");
  });

  test("«Entfernen» bei einer Nachricht blendet sie beiden Seiten aus", async ({ page, baseURL }) => {
    const member = await createMember(track, `mod_${Date.now()}`.slice(0, 20));
    const provider = await createProvider(track, "Moderationsprofil");
    const conversation = await createConversation(track, member, provider);
    const secret = `Fiktiv beleidigender Text ${Date.now()}`;
    const message = await addMessageWithId(conversation, member.id, secret);
    const id = await createMessageCase(track, { reporterId: provider.id, conversationId: conversation, senderId: member.id, message, body: secret, priority: "HIGH", reason: "harassment" });
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    track.users.push(moderator.id);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto(`/de/admin/moderation/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: /· Nachricht · Hoch$/ })).toBeVisible();
    await expect(page.locator("[data-evidence=hidden]")).toBeVisible();
    expect(await page.content()).not.toContain(secret);
    const form = page.locator("[data-case-decision-form]");
    await expect(form.getByRole("radio")).toHaveCount(3);
    await form.getByRole("radio", { name: "Entfernen" }).click();
    await form.getByLabel("Begründung").fill("Fiktive Beleidigung, Regel R-MOD-1.");
    await form.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(form.getByRole("link", { name: "Wähle die Regel, auf die sich der Entscheid stützt." })).toBeVisible();
    await form.getByRole("combobox", { name: "Regel" }).click();
    await expect(page.getByRole("option", { name: /^R-MOD-0/ })).toHaveCount(0);
    await page.getByRole("option", { name: "R-MOD-1 Belästigung, Drohung oder Beleidigung" }).click();
    await expectNoSeriousAxeFindings(page);
    await form.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(page.getByText("Entscheid gespeichert", { exact: true })).toBeVisible();
    // Danach öffnet sich der nächste Fall oder die Warteschlange.
    await expect(page).not.toHaveURL(`/de/admin/moderation/${id}`);
    expect(await caseRow(id)).toMatchObject({ status: "RESOLVED", decision: "CONTENT_REMOVED", rule: "R-MOD-1" });

    for (const [account, path] of [
      [member, `/de/nachrichten/${conversation}`],
      [provider, `/de/studio/nachrichten/${conversation}`],
    ] as const) {
      await signInAs(page, account, baseURL);
      await page.goto(path);
      await expect(page.locator("[data-message-hidden]")).toHaveText("Von der Moderation ausgeblendet");
      expect(await page.content()).not.toContain(secret);
    }
  });

  test("«Konto einschränken» für Nachrichten: der Composer zeigt den Hinweis mit Ende", async ({ page, baseURL }) => {
    const member = await createMember(track);
    const provider = await createProvider(track, "Einschraenkprofil");
    const conversation = await createConversation(track, member, provider);
    const id = await createCase(track, { reporterId: provider.id, targetType: "USER", targetId: member.id, reason: "harassment", priority: "HIGH" });
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    track.users.push(moderator.id);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto(`/de/admin/moderation/${id}`);
    const form = page.locator("[data-case-decision-form]");
    await form.getByRole("radio", { name: "Konto einschränken" }).click();
    // Moderation darf einschränken, aber nicht sperren.
    await expect(form.getByRole("radio", { name: "Konto sperren" })).toHaveCount(0);
    await form.getByRole("combobox", { name: "Regel" }).click();
    await page.getByRole("option", { name: /^R-MOD-1/ }).click();
    await form.getByLabel("Begründung").fill("Fiktive wiederholte Belästigung im Test.");
    await form.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(form.getByRole("link", { name: "Wähle, ob Nachrichten oder Termine eingeschränkt werden." })).toBeVisible();
    await form.getByRole("radio", { name: "Nachrichten", exact: true }).click();
    const end = new Date(Date.now() + 10 * 86_400_000);
    const endText = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" }).format(end);
    await form.getByRole("textbox", { name: /Ende/ }).fill(endText);
    await form.getByRole("textbox", { name: /Ende/ }).blur();
    await form.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(page.getByText("Entscheid gespeichert", { exact: true })).toBeVisible();
    await expect.poll(async () => (await restrictions(member.id)).map((row) => row.kind)).toEqual(["MESSAGING"]);

    await signInAs(page, member, baseURL);
    await page.goto(`/de/nachrichten/${conversation}`);
    const notice = page.locator("[data-restriction-notice=MESSAGING]");
    await expect(notice).toContainText(`Dein Konto ist für Nachrichten eingeschränkt bis ${endText}.`);
    await expect(notice.getByRole("link", { name: "Grund und Einspruch ansehen" })).toHaveAttribute("href", "/de/einstellungen/daten#einschraenkungen");
    await expect(page.getByRole("textbox", { name: /Nachricht an/ })).toHaveCount(0);
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
  });

  test("unter 1024 px ist der Fall nur lesend", async ({ page, baseURL }) => {
    const reporter = await createMember(track);
    const id = await createCase(track, { reporterId: reporter.id, targetType: "USER", targetId: reporter.id, reason: "spam", priority: "LOW" });
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    track.users.push(moderator.id);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`/de/admin/moderation/${id}`);
    await expect(page.getByText("Entscheiden geht ab 1024 px Breite")).toBeVisible();
    await expect(page.locator("[data-case-decision-form]")).toBeHidden();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);
  });
});
