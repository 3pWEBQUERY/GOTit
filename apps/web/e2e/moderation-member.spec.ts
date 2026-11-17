import { PASSWORD, query, signInAdmin, signInAs } from "./admin-fixtures";
import {
  caseRow,
  cleanupModeration,
  createCase,
  createMedia,
  createMember,
  createProvider,
  mediaStatus,
  moderationTracked,
  restrict,
  restrictions,
  switchToAdmin,
} from "./moderation-fixtures";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Die Seite der Betroffenen (Schritt 1.13, v1 9.2, v2 12.4): Einschränkung
 * in den Einstellungen mit Einspruch, Einspruch gegen ein gesperrtes Medium
 * im Studio, Entscheid durch eine zweite Person und die Anmeldung eines
 * gesperrten Kontos.
 */
const track = moderationTracked();
test.afterEach(async () => {
  await cleanupModeration(track);
});

test.describe("Einschränkungen aus Sicht des Kontos", () => {
  test("Einstellungen zeigen die Einschränkung; Einspruch einmal, Entscheid durch eine zweite Person", async ({ browser, page, baseURL }) => {
    const member = await createMember(track);
    const first = await signInAdmin(page, baseURL, "MODERATOR", "Erstmoderation Fiktiv");
    track.users.push(first.id);
    const restrictionId = await restrict(member.id, "MESSAGING", first.id);

    const memberContext = await browser.newContext({ baseURL, locale: "de-CH", timezoneId: "Europe/Zurich" });
    const memberPage = await memberContext.newPage();
    await signInAs(memberPage, member, baseURL);
    await memberPage.goto("/de/einstellungen/daten");
    const section = memberPage.getByRole("region", { name: "Einschränkungen" });
    const entry = section.locator("[data-own-restriction=MESSAGING]");
    await expect(entry).toContainText("Nachrichten eingeschränkt");
    await expect(entry).toContainText("Belästigung, Drohung oder Beleidigung");
    await expect(entry).toContainText("Fiktive Begründung der Einschränkung für den Test.");
    await expect(entry).toContainText("Bis die Moderation sie aufhebt");
    await expectNoSeriousAxeFindings(memberPage);
    await entry.getByLabel("Warum ist die Einschränkung falsch?").fill("Zu kurz");
    await entry.getByRole("button", { name: "Einspruch senden" }).click();
    await expect(entry.getByText("Schreib mindestens 20 Zeichen.")).toBeVisible();
    await entry.getByLabel("Warum ist die Einschränkung falsch?").fill("Fiktiver Einspruch: Die Nachrichten waren nicht beleidigend gemeint.");
    await entry.getByRole("button", { name: "Einspruch senden" }).click();
    await expect(memberPage.getByText("Einspruch gesendet", { exact: true })).toBeVisible();
    await expect(entry.locator("[data-own-appeal=OPEN]")).toHaveText("Dein Einspruch ist eingegangen und wird geprüft.");
    await expect(entry.getByRole("button", { name: "Einspruch senden" })).toHaveCount(0);
    await memberPage.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(memberPage);

    // Wer die Einschränkung verhängt hat, entscheidet nicht über den Einspruch.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/de/admin/moderation?ansicht=sperren");
    await expect(page.getByRole("navigation", { name: "Ansicht der Moderation" }).getByRole("link", { name: "Einsprüche gegen Sperren" })).toHaveAttribute("aria-current", "page");
    const item = page.locator(`[data-restriction-appeal="${restrictionId}"]`);
    await expect(item).toContainText("Fiktiver Einspruch: Die Nachrichten waren nicht beleidigend gemeint.");
    await expect(item).toContainText("Du hast diese Einschränkung verhängt");
    await expect(item.locator("[data-appeal-decision]")).toHaveCount(0);
    await expectNoSeriousAxeFindings(page);

    const second = await switchToAdmin(page, baseURL, "MODERATOR", "Zweitmoderation Fiktiv");
    track.users.push(second.id);
    await page.goto("/de/admin/moderation?ansicht=sperren");
    const form = page.locator(`[data-restriction-appeal="${restrictionId}"] [data-appeal-decision]`);
    await form.getByRole("radio", { name: "Einspruch stattgeben" }).click();
    await form.getByLabel("Begründung").fill("Fiktive Zweitprüfung: Einschränkung war zu streng.");
    await form.getByRole("button", { name: "Entscheid zum Einspruch speichern" }).click();
    await expect(page.getByText("Einspruch stattgegeben", { exact: true })).toBeVisible();
    const [row] = await restrictions(member.id);
    expect(row?.appealStatus).toBe("UPHELD");
    expect(row?.liftedAt).not.toBeNull();

    await memberPage.reload();
    await expect(memberPage.getByRole("region", { name: "Einschränkungen" })).toHaveCount(0);
    await memberContext.close();
  });

  test("gesperrtes Medium im Studio: Einspruch, Entscheid durch eine zweite Person stellt es wieder her", async ({ browser, page, baseURL }) => {
    const provider = await createProvider(track, "Medieneinspruch");
    const reporter = await createMember(track);
    const mediaId = await createMedia(track, provider, "BLOCKED");
    const first = await signInAdmin(page, baseURL, "MODERATOR", "Erstmoderation Fiktiv");
    track.users.push(first.id);
    const caseId = await createCase(track, { reporterId: reporter.id, targetType: "MEDIA", targetId: mediaId, reason: "impersonation", priority: "HIGH" });
    await query(
      `update report set status = 'RESOLVED', decision = 'CONTENT_REMOVED', rule = 'R-MOD-3', "decisionReason" = 'Fiktiv: fremdes Bild ohne Rechte.', "decidedById" = $2, "decidedAt" = now(), "contentBlockedAt" = now(), "contentPreviousState" = 'PUBLISHED' where id = $1`,
      [caseId, first.id],
    );

    const studioContext = await browser.newContext({ baseURL, locale: "de-CH", timezoneId: "Europe/Zurich" });
    const studio = await studioContext.newPage();
    await signInAs(studio, provider, baseURL);
    await studio.goto(`/de/studio/medien/${mediaId}`);
    const note = studio.locator("[data-media-case]");
    await expect(note).toContainText(/Fall M-\d{4}-\d{5} · Falsche Identität oder fremde Bilder · entschieden am \d{2}\.\d{2}\.\d{4}/);
    await expect(note).toContainText("Fiktiv: fremdes Bild ohne Rechte.");
    await note.getByLabel("Warum soll das Medium wieder sichtbar sein?").fill("Fiktiv: Das Bild zeigt mich selbst, die Rechte liegen bei mir.");
    await note.getByRole("button", { name: "Einspruch senden" }).click();
    await expect(studio.getByText("Einspruch gesendet", { exact: true })).toBeVisible();
    await expect(studio.locator("[data-media-case=OPEN]")).toContainText("Dein Einspruch ist eingegangen und wird geprüft.");
    expect((await caseRow(caseId))?.appealStatus).toBe("OPEN");
    await expectNoSeriousAxeFindings(studio);
    await studio.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(studio);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/de/admin/moderation?status=einspruch");
    await expect(page.getByRole("table").getByRole("row").filter({ has: page.locator(`[data-case-link="${caseId}"]`) })).toContainText("Einspruch offen");
    await page.goto(`/de/admin/moderation/${caseId}`);
    await expect(page.locator("[data-case-appeal=OPEN]")).toContainText("Fiktiv: Das Bild zeigt mich selbst, die Rechte liegen bei mir.");
    await expect(page.locator("[data-same-person-note]")).toContainText("Über diesen Einspruch entscheidet jemand anderes");
    await expect(page.locator("[data-appeal-decision]")).toHaveCount(0);

    const second = await switchToAdmin(page, baseURL, "MODERATOR", "Zweitmoderation Fiktiv");
    track.users.push(second.id);
    await page.goto(`/de/admin/moderation/${caseId}`);
    const form = page.locator("[data-appeal-decision]");
    await form.getByRole("button", { name: "Entscheid zum Einspruch speichern" }).click();
    await expect(form.getByRole("link", { name: "Wähle, ob du dem Einspruch stattgibst oder ihn abweist." })).toBeVisible();
    await form.getByRole("radio", { name: "Einspruch stattgeben" }).click();
    await form.getByLabel("Begründung").fill("Fiktive Zweitprüfung: Rechte belegt.");
    await form.getByRole("button", { name: "Entscheid zum Einspruch speichern" }).click();
    await expect(page.getByText("Einspruch stattgegeben", { exact: true })).toBeVisible();
    await expect.poll(() => mediaStatus(mediaId)).toBe("PUBLISHED");
    expect((await caseRow(caseId))?.appealStatus).toBe("UPHELD");
    await studioContext.close();
  });

  test("ein gesperrtes Konto meldet sich nicht an und erfährt, wie es weitergeht", async ({ page }) => {
    const member = await createMember(track);
    await restrict(member.id, "SUSPENDED", "e2e-moderation");
    await page.goto("/de/anmelden");
    await page.getByLabel("E-Mail-Adresse").fill(member.email);
    await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Mit E-Mail anmelden" }).click();
    await expect(page.getByText("Dieses Konto ist gesperrt.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Zum Kontaktformular" })).toHaveAttribute("href", "/de/kontakt");
    await expect(page).toHaveURL(/\/de\/anmelden/);
    const sessions = await query<{ count: string }>(`select count(*) from session where "userId" = $1`, [member.id]);
    expect(Number(sessions[0]?.count)).toBe(0);
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
  });
});
