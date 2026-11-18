import { randomUUID } from "node:crypto";
import type { Browser, Page } from "@playwright/test";
import sharp from "sharp";
import { cleanup, query } from "./admin-fixtures";
import { dayIn } from "./booking-studio-fixtures";
import { visitor } from "./search-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { adminPage, userIdByEmail } from "./support/journey";
import { uniqueEmail } from "./support/outbox";
import { confirmEmailFromOutbox, registerViaUi } from "./support/register";
import { expect, test } from "./support/test";

/**
 * Journey B, «Einzelanbieter erstellt ein Profil» (PRD v1 17, v2 11.8, Schritt 1.14).
 * Ein Ablauf durch die echte Oberfläche, ohne Abkürzung über die Datenbank:
 *
 *  1. Registrierung                → Kontotyp «Anbieter»
 *  2. E-Mail-Verifizierung         → Link aus dem Ausgang, «Profil einrichten»
 *  3. Alters- und Identitätsprüfung→ Test-Dienstleister (IDENTITY_PROVIDER=test), «Bestanden»
 *  4. Regionen                     → «Zürich»
 *  5. Rechtliche Voraussetzungen   → Es gibt keinen eigenen Schritt dafür (v2 11.8 hat acht
 *                                    Schritte). Geprüft wird, was die Plattform heute prüft:
 *                                    Volljährigkeit über die Identität (Schritt 3), nur rechtlich
 *                                    freigegebene Regionen wählbar (Aargau ist nicht freigegeben
 *                                    und fehlt, v1 9.5), und «Einreichen» prüft alle Voraussetzungen
 *                                    («Alles bereit.») und verlangt die Zustimmung zur Veröffentlichung
 *                                    (v1 FR-VERIFY-002). Kantonale Bewilligungen sind ein offenes Gate
 *                                    (Entscheid 0010).
 *  6. Strukturierte Profildaten    → Anzeigename, Beschreibung, Sprachen
 *  7. Medien                       → erzeugtes JPEG hochladen; der Worker verarbeitet es («In Prüfung»)
 *  8. Dienstleistungen und Preise  → ein Preis; Leistungen kommen mit den Kategorien (Entscheid 0004)
 *  9. Verfügbarkeit                → Arbeitszeiten am Montag, gespeichert im Onboarding
 * 10. Vorschau                     → Name, Region, Preis, «Identität geprüft»
 * 11. Einreichen                   → «Dein Profil wird geprüft»
 * 12. Freigabe                     → Moderation mit 2FA in /admin/verifizierungen und /admin/medien
 * 13. Veröffentlicht               → öffentlich unter /p/[name] mit Foto und in der Suche
 * 14. Nachrichten und Termine      → /studio/nachrichten und /studio/kalender mit den Arbeitszeiten
 *
 * Erfolgsziel «Verständliches Onboarding mit klar sichtbarem Fortschritt»: Jeder der
 * acht Schritte zeigt den Fortschritt mit dem aktuellen Schritt und allen vorigen als
 * «erledigt», und jeder Schritt führt mit genau einem «Weiter» zum nächsten (ONBOARDING_PAGES
 * Seiten von der Identität bis zum Einreichen, keine Umwege).
 *
 * Einzige Abkürzung: Die Gegenseite (Moderation) ist ein frisches Admin-Konto aus
 * admin-fixtures mit 2FA. Der Anzeigename trägt ein zufälliges Kennwort, damit die
 * Warteschlangen paralleler Tests nicht stören.
 */
const ONBOARDING_PAGES = 8;
const created: string[] = [];
test.afterAll(async () => cleanup(created));
test.use({ viewport: { width: 1280, height: 900 } });

const progress = (page: Page) => page.getByRole("navigation", { name: "Fortschritt der Profilerstellung" });

/** Prüft auf jeder Seite des Onboardings den sichtbaren Fortschritt (Erfolgsziel) und axe. */
async function expectStep(page: Page, index: number, title: string, visited: string[]): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  const steps = progress(page).getByRole("listitem");
  await expect(steps).toHaveCount(ONBOARDING_PAGES);
  await expect(steps.nth(index)).toHaveAttribute("aria-current", "step");
  for (let done = 0; done < index; done += 1) await expect(steps.nth(done)).toContainText("erledigt");
  await expectNoSeriousAxeFindings(page);
  visited.push(new URL(page.url()).pathname);
}

async function photo(): Promise<Buffer> {
  return sharp({ create: { width: 1200, height: 1500, channels: 3, background: { r: 122, g: 106, b: 92 }, noise: { type: "gaussian", mean: 120, sigma: 20 } } })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/** Schritt 12: Die Moderation (frisches Konto mit 2FA) gibt Profil und Foto in den Warteschlangen frei. */
async function approveByModeration(browser: Browser, baseURL: string | undefined, displayName: string, mediaId: string): Promise<void> {
  const admin = await adminPage(browser, baseURL, "MODERATOR", created);
  await admin.goto("/de/admin/verifizierungen");
  await expect(admin.getByRole("heading", { level: 1, name: "Verifizierungen" })).toBeVisible();
  await expectNoSeriousAxeFindings(admin);
  await admin.getByRole("table", { name: "Offene Prüffälle" }).getByRole("link", { name: displayName }).click();
  await expect(admin.getByRole("heading", { level: 1, name: `Prüffall ${displayName}` })).toBeVisible();
  const facts = admin.getByRole("region", { name: "Angaben" });
  await expect(facts).toContainText("Deutsch, Englisch");
  await expect(facts.getByRole("table", { name: "Preise" })).toContainText("60 Minuten");
  await expectNoSeriousAxeFindings(admin);
  await admin.getByRole("radio", { name: "Freigeben" }).click();
  await admin.getByLabel("Begründung").fill("Angaben vollständig, Identität gültig, Region freigegeben.");
  await admin.getByRole("combobox", { name: "Regel" }).click();
  await admin.getByRole("option", { name: "R-1 Angaben vollständig" }).click();
  await admin.getByRole("button", { name: "Entscheid speichern" }).click();
  await expect(admin.getByText("Entscheid gespeichert", { exact: true })).toBeVisible();

  // … und das Foto in /admin/medien.
  await admin.goto("/de/admin/medien");
  await expect(admin.getByRole("heading", { level: 1, name: "Medien" })).toBeVisible();
  await expectNoSeriousAxeFindings(admin);
  await admin.locator(`[data-media-case-link="${mediaId}"]`).filter({ visible: true }).click();
  await expect(admin.getByRole("heading", { level: 1, name: `Medium von ${displayName}` })).toBeVisible();
  await admin.getByRole("button", { name: "Medium anzeigen" }).click();
  const shown = admin.locator("[data-media-preview=shown] img");
  await expect.poll(() => shown.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  await expectNoSeriousAxeFindings(admin);
  await admin.getByRole("radio", { name: "Freigeben" }).click();
  await admin.getByLabel("Begründung").fill("Foto entspricht den Richtlinien, keine identifizierenden Details.");
  await admin.getByRole("combobox", { name: "Regel" }).click();
  await admin.getByRole("option", { name: /^M-1/ }).click();
  await admin.getByRole("button", { name: "Entscheid speichern" }).click();
  await expect(admin.getByText("Entscheid gespeichert", { exact: true })).toBeVisible();
  await admin.context().close();
}

test("Journey B: Registrierung → Verifizierung → acht Schritte → Einreichen → Freigabe → öffentlich → Nachrichten und Kalender", async ({ page, browser, baseURL }) => {
  test.setTimeout(300_000);
  const word = `Journeyb${randomUUID().replaceAll("-", "").slice(0, 8)}`;
  const displayName = `${word} Fiktiv`;
  const email = uniqueEmail("journey-b");
  const visited: string[] = [];

  // 1–2: Registrierung und E-Mail-Verifizierung.
  await registerViaUi(page, { type: "Anbieter", name: "Journey-Anbieterin Fiktiv", email });
  const userId = await userIdByEmail(email);
  created.push(userId);
  await expectNoSeriousAxeFindings(page);
  await confirmEmailFromOutbox(page, email);
  await expectNoSeriousAxeFindings(page);
  await page.getByRole("link", { name: "Profil einrichten" }).click();

  // 3: Identität beim Test-Dienstleister.
  await expect(page).toHaveURL(/\/de\/studio\/start\/identitaet$/);
  await expectStep(page, 0, "Identität prüfen", visited);
  await page.getByRole("button", { name: "Prüfung starten" }).click();
  await page.waitForURL(/\/de\/dev\/verifizierung\//);
  await expect(page.getByText("Test-Dienstleister, keine echte Prüfung")).toBeVisible();
  await expectNoSeriousAxeFindings(page);
  await page.getByRole("button", { name: "Bestanden", exact: true }).click();
  await page.waitForURL(/\/de\/studio\/start\/identitaet$/);
  await expect(page.locator("[data-identity-status]")).toHaveAttribute("data-identity-status", "valid");
  await page.getByRole("link", { name: "Weiter zu Regionen" }).click();

  // 4–5: Regionen; nur rechtlich freigegebene stehen zur Wahl.
  await expect(page).toHaveURL(/\/de\/studio\/start\/regionen$/);
  await expectStep(page, 1, "Regionen wählen", visited);
  await expect(page.getByRole("checkbox", { name: "Ganzer Kanton Zürich" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Aargau/ })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Zürich", exact: true }).click();
  await page.getByRole("button", { name: "Speichern und weiter" }).click();

  // 6: Strukturierte Profildaten.
  await expect(page).toHaveURL(/\/de\/studio\/start\/profil$/);
  await expectStep(page, 2, "Profil beschreiben", visited);
  await page.getByLabel("Anzeigename").fill(displayName);
  await page.getByLabel("Beschreibung").fill("Fiktive Beschreibung aus Journey B. Ruhig, pünktlich und klar in der Absprache, Termine in Zürich.");
  await page.getByRole("checkbox", { name: "Deutsch" }).click();
  await page.getByRole("checkbox", { name: "Englisch" }).click();
  await page.getByRole("button", { name: "Speichern und weiter" }).click();

  // 7: Medien hochladen; der Worker verarbeitet das Foto.
  await expect(page).toHaveURL(/\/de\/studio\/start\/medien$/);
  await expectStep(page, 3, "Medien", visited);
  await page.waitForLoadState("networkidle");
  await page.getByRole("checkbox", { name: /Ich habe die Rechte an diesen Fotos/ }).click();
  await page.locator("[data-upload-panel] input[type=file]").setInputFiles({ name: "journey-foto.jpg", mimeType: "image/jpeg", buffer: await photo() });
  const [profile] = await query<{ id: string; slug: string }>(`select id, slug from provider_profile where "userId" = $1`, [userId]);
  await expect.poll(async () => (await query<{ id: string }>(`select id from media_asset where "providerProfileId" = $1`, [profile?.id]))[0]?.id, { timeout: 20_000 }).toBeTruthy();
  const [media] = await query<{ id: string }>(`select id from media_asset where "providerProfileId" = $1`, [profile?.id]);
  const mediaId = media?.id ?? "";
  await expect(page.locator(`[data-media-id="${mediaId}"]`).getByText("In Prüfung")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator(`[data-media-id="${mediaId}"]`).getByText("Titelbild")).toBeVisible();
  await page.getByRole("button", { name: "Schritt überspringen" }).click();

  // 8: Dienstleistungen und Preise.
  await expect(page).toHaveURL(/\/de\/studio\/start\/angebot$/);
  await expectStep(page, 4, "Angebot und Preise", visited);
  await expect(page.getByText("Leistungen wählst du, sobald die Kategorien gepflegt sind.")).toBeVisible();
  await page.getByRole("button", { name: "Preis hinzufügen" }).click();
  await page.locator("#angebot-preis-0").fill("320");
  await page.getByRole("button", { name: "Speichern und weiter" }).click();

  // 9: Verfügbarkeit im Onboarding (behobene Lücke: vorher nur ein Hinweis «bald»).
  await expect(page).toHaveURL(/\/de\/studio\/start\/verfuegbarkeit$/);
  await expectStep(page, 5, "Verfügbarkeit", visited);
  await page.waitForLoadState("networkidle");
  const windows = page.locator("[data-windows-form]");
  await windows.getByRole("switch", { name: "Montag verfügbar" }).click();
  await windows.getByRole("button", { name: "Arbeitszeiten speichern" }).click();
  await expect(windows.getByRole("status")).toHaveText("Arbeitszeiten gespeichert");
  await page.getByRole("button", { name: "Weiter zu Vorschau" }).click();

  // 10: Vorschau.
  await expect(page).toHaveURL(/\/de\/studio\/start\/vorschau$/);
  await expectStep(page, 6, "Vorschau ansehen", visited);
  const preview = page.locator("[data-preview]");
  await expect(preview.getByRole("heading", { level: 3, name: displayName })).toBeVisible();
  await expect(preview).toContainText("Zürich");
  await expect(preview.getByRole("table")).toContainText("CHF 320");
  await expect(preview.getByRole("list", { name: "Vertrauenssignale" })).toContainText("Identität geprüft");
  await page.getByRole("button", { name: "Vorschau bestätigen" }).click();

  // 5 und 11: Voraussetzungen erfüllt, Zustimmung, Einreichen.
  await expect(page).toHaveURL(/\/de\/studio\/start\/einreichen$/);
  await expectStep(page, 7, "Profil einreichen", visited);
  await expect(page.getByText("Alles bereit.")).toBeVisible();
  await expect(page.locator("[data-missing-steps]")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Ich stimme der Veröffentlichung dieses Profils zu." }).check();
  await page.getByRole("button", { name: "Profil einreichen" }).click();
  await expect(page).toHaveURL(/\/de\/studio$/);
  await expect(page.locator("[data-todo=status]")).toContainText("Dein Profil wird geprüft");
  await expectNoSeriousAxeFindings(page);
  // Erfolgsziel: acht Seiten, jede genau einmal, in der Reihenfolge von v2 11.8.
  expect(visited).toEqual(["identitaet", "regionen", "profil", "medien", "angebot", "verfuegbarkeit", "vorschau", "einreichen"].map((slug) => `/de/studio/start/${slug}`));

  // Noch nicht öffentlich.
  const guest = await visitor(browser, "/de");
  expect((await guest.goto(`/de/p/${profile?.slug}`))?.status()).toBe(404);

  // 12: Freigabe durch die Moderation (2FA) in der Prüfwarteschlange …
  await approveByModeration(browser, baseURL, displayName, mediaId);

  // 13: Veröffentlicht und öffentlich sichtbar, mit Foto, auch in der Suche.
  await page.goto("/de/studio");
  await expect(page.locator("[data-todo=status]")).toHaveCount(0);
  await guest.goto(`/de/p/${profile?.slug}`);
  await expect(guest.getByRole("heading", { level: 1, name: displayName })).toBeVisible();
  await expect(guest.getByRole("list", { name: "Vertrauenssignale" })).toContainText("Identität geprüft");
  await expect(guest.getByRole("table")).toContainText("CHF 320");
  await expect(guest.locator("[data-media-placeholder]")).toHaveCount(0);
  await expect.poll(() => guest.locator("main img").first().evaluate((element: HTMLImageElement) => element.naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
  await expectNoSeriousAxeFindings(guest);
  await expect(async () => {
    await guest.goto(`/de/suche?q=${word}`);
    await expect(guest.getByRole("heading", { level: 1 })).toHaveText("1 Profil", { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await expect(guest.locator("#inhalt [data-search-results] > li h3")).toHaveText([displayName]);
  await guest.context().close();

  // 14: Nachrichten und Termine verwalten.
  await page.getByRole("navigation").getByRole("link", { name: "Nachrichten" }).first().click();
  await expect(page).toHaveURL(/\/de\/studio\/nachrichten$/);
  await expect(page.getByRole("heading", { level: 1, name: "Nachrichten" })).toBeVisible();
  await expect(page.getByText("Noch keine Nachrichten")).toBeVisible();
  await expectNoSeriousAxeFindings(page);
  await page.getByRole("navigation").getByRole("link", { name: "Kalender" }).first().click();
  await expect(page).toHaveURL(/\/de\/studio\/kalender/);
  await expect(page.locator("[data-calendar]")).toBeVisible();
  await expectNoSeriousAxeFindings(page);
  // Die Arbeitszeiten aus dem Onboarding stehen im Kalender (nächster Montag, Wochenansicht).
  await page.goto(`/de/studio/kalender?ansicht=woche&datum=${dayIn(8 - new Date().getDay() || 7)}`);
  await expect(page.locator("[data-calendar] [data-kind=available]").first()).toBeVisible();
  await expectNoSeriousAxeFindings(page);
});
