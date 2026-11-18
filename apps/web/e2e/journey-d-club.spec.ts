import { randomUUID } from "node:crypto";
import { query } from "./admin-fixtures";
import { linkedProviders } from "./clubs-fixtures";
import { signedInPage } from "./messages-fixtures";
import { cleanupOrganizations } from "./organization-fixtures";
import { visitor } from "./search-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { adminPage, StepCounter, userIdByEmail } from "./support/journey";
import { uniqueEmail } from "./support/outbox";
import { confirmEmailFromOutbox, registerViaUi } from "./support/register";
import { expect, test } from "./support/test";

/**
 * Journey D, «Club verwaltet sein Unternehmen» (PRD v1 17, v2 7.7, 12.2, Schritt 1.14).
 * Ein Ablauf durch die echte Oberfläche:
 *
 *  1. Unternehmenskonto registrieren → Kontotyp «Club» mit Name des Clubs, E-Mail bestätigen
 *  2. Nachweise einreichen           → Firmenname, UID, Berechtigung, Bewilligungen
 *  3. Freigabe                       → Moderation mit 2FA in /admin/unternehmen
 *  4. Standort erstellen             → Standort mit Öffnungszeiten am Freitag
 *  5. Mitarbeiterrollen definieren   → Phase 2 (v2 7.7: /team ist Phase 2). Geprüft wird, was
 *                                      Phase 1 hat: Einstellungen nennen die eigene Rolle «Inhaber»
 *                                      mit der Rechte-Liste und den Hinweis auf Phase 2; die
 *                                      Seitenleiste hat noch keinen Eintrag «Team».
 *  6. Anbieter einladen              → per Profil-URL, mit Standort; Status «Eingeladen»
 *  7. Freigegebene Profile darstellen→ Anbieter nimmt in /studio/verknuepfungen an; erst danach
 *                                      zeigt die öffentliche Clubseite das Profil (auch am Standort),
 *                                      und das Profil nennt den Club unter «Verknüpft mit»
 *  8. Unternehmensangebote           → nicht anwendbar: /angebote ist Phase 2 (v2 7.7)
 *  9. Kampagnen buchen               → nicht anwendbar: /werbung ist Phase 2 (v2 7.7)
 * 10. Unternehmensstatistiken        → nicht anwendbar: /statistik ist Phase 2 (v2 7.7)
 *
 * Erfolgsziel «Professionelle Organisation bei Erhalt individueller Anbieterrechte»:
 * Die Verknüpfung entsteht erst durch die Zustimmung des Anbieters (vorher fehlt er
 * auf der Clubseite), der Club sieht keine Nachrichten, Ausweisdaten oder Kalender,
 * und vom freigegebenen Club bis zur gesendeten Einladung braucht der Inhaber
 * höchstens SETUP_STEPS Bedienschritte (Standort anlegen, Öffnungszeiten, Einladung).
 *
 * Testdaten: Der eingeladene Anbieter ist ein veröffentlichtes Profil aus den
 * Fixtures (Gegenseite, sein Onboarding prüft Journey B); die Moderation ist ein
 * frisches Admin-Konto mit 2FA.
 */
const SETUP_STEPS = 9;
const organizations: string[] = [];
const users: string[] = [];
test.afterAll(async () => cleanupOrganizations(organizations, users));
test.use({ viewport: { width: 1280, height: 900 } });

test("Journey D: Club registrieren → Nachweise → Freigabe → Standort → Rollen → Einladung → angenommen → Clubseite", async ({ page, browser, baseURL }) => {
  test.setTimeout(240_000);
  const suffix = randomUUID().slice(0, 8);
  const clubName = `Journey Club ${suffix} Fiktiv`;
  const email = uniqueEmail("journey-d");
  const [provider] = await linkedProviders(users, 1);
  if (!provider) throw new Error("Anbieter fehlt");

  // 1: Unternehmenskonto registrieren und bestätigen.
  await registerViaUi(page, { type: "Club", name: "Journey-Inhaberin Fiktiv", email, organization: clubName });
  const userId = await userIdByEmail(email);
  users.push(userId);
  const [organization] = await query<{ id: string; slug: string }>(
    `select o.id, o.slug from organization o join organization_member m on m."organizationId" = o.id where m."userId" = $1`,
    [userId],
  );
  if (!organization) throw new Error("Organisation fehlt");
  organizations.push(organization.id);
  await expectNoSeriousAxeFindings(page);
  await confirmEmailFromOutbox(page, email);
  await expectNoSeriousAxeFindings(page);
  await page.getByRole("link", { name: "Studio öffnen" }).click();
  await expect(page).toHaveURL(new RegExp(`/de/studio/o/${organization.slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Heute bei ${clubName}`);
  await expect(page.locator("[data-todo=nachweise]")).toContainText("Nachweise einreichen");
  await expectNoSeriousAxeFindings(page);

  // 2: Nachweise einreichen.
  const sidebar = page.locator("[data-studio-sidebar]");
  await sidebar.getByRole("link", { name: "Nachweise" }).click();
  await expect(page).toHaveURL(new RegExp(`/de/studio/o/${organization.slug}/nachweise$`));
  await page.waitForLoadState("networkidle");
  await expect(page.locator("[data-verification-state]")).toHaveAttribute("data-verification-state", "NONE");
  await page.getByLabel("Firmenname laut Handelsregister").fill(`${clubName} GmbH`);
  await page.getByLabel("UID", { exact: true }).fill("CHE-123.456.789");
  await page.getByRole("checkbox", { name: "Ich bin berechtigt, für diese Organisation zu handeln." }).click();
  await page.getByLabel(/Bewilligungen/).fill("Gastgewerbebewilligung der Stadt Zürich, fiktiv.");
  await expectNoSeriousAxeFindings(page);
  await page.getByRole("button", { name: "Nachweise einreichen" }).click();
  await expect(page.locator("[data-verification-state]")).toHaveAttribute("data-verification-state", "SUBMITTED");
  const [verification] = await query<{ id: string }>(`select id from organization_verification where "organizationId" = $1`, [organization.id]);

  // 3: Freigabe in /admin/unternehmen.
  const admin = await adminPage(browser, baseURL, "MODERATOR", users);
  await admin.goto("/de/admin/unternehmen");
  await expect(admin.getByRole("navigation", { name: "Bereiche des Admins" }).getByRole("link", { name: /Unternehmen/ })).toHaveAttribute("aria-current", "page");
  await expectNoSeriousAxeFindings(admin);
  await admin.locator(`[data-organization-case-link="${verification?.id}"]`).locator("visible=true").click();
  await expect(admin.getByRole("heading", { level: 1, name: `Prüfung von ${clubName}` })).toBeVisible();
  await expect(admin.getByText("Gastgewerbebewilligung der Stadt Zürich, fiktiv.")).toBeVisible();
  await admin.waitForLoadState("networkidle");
  await expectNoSeriousAxeFindings(admin);
  await admin.getByRole("radio", { name: /Freigeben/ }).click();
  await admin.getByLabel("Begründung").fill("Firmenname und UID stimmen mit dem Register überein.");
  await admin.getByRole("button", { name: "Entscheid speichern" }).click();
  await expect(admin.getByText("Entscheid gespeichert", { exact: true })).toBeVisible();
  await admin.context().close();
  await sidebar.getByRole("link", { name: "Unternehmensprofil" }).click();
  await expect(page.locator("[data-organization-status]")).toHaveText("Veröffentlicht");
  await expect(page.locator("[data-verification-status]")).toHaveText("Freigegeben");
  await expectNoSeriousAxeFindings(page);

  // 4: Standort mit Öffnungszeiten.
  const steps = new StepCounter();
  await sidebar.getByRole("link", { name: "Standorte" }).click();
  await expect(page.getByText("Noch kein Standort")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await steps.click(page.getByRole("button", { name: "Standort hinzufügen" }), "Standort hinzufügen");
  const dialog = page.getByRole("dialog", { name: "Standort hinzufügen" });
  await dialog.getByLabel("Name des Standorts").fill("Journey Standort Langstrasse");
  await dialog.getByLabel("Allgemeine Ortsangabe").fill("Kreis 4");
  await steps.click(dialog.getByRole("button", { name: "Standort anlegen" }), "Standort anlegen");
  await expect(page.getByRole("heading", { level: 1, name: "Journey Standort Langstrasse" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const hours = page.locator("[data-hours-form]");
  await steps.click(hours.getByRole("switch", { name: "Freitag geöffnet" }), "Freitag öffnen");
  await steps.click(hours.getByRole("button", { name: "Öffnungszeiten speichern" }), "Öffnungszeiten speichern");
  await expect(hours.getByText("Öffnungszeiten gespeichert")).toBeVisible();
  await expectNoSeriousAxeFindings(page);
  const locationId = page.url().split("/").pop() ?? "";

  // 5: Rollen: Phase 1 zeigt die eigene Rolle und ihre Rechte; Team folgt in Phase 2.
  await sidebar.getByRole("link", { name: "Einstellungen" }).click();
  await expect(page.locator("[data-organization-role]")).toHaveText("Inhaber");
  await expect(page.getByRole("heading", { name: "Was deine Rolle darf" })).toBeVisible();
  await expect(page.getByText("Mitarbeitende einladen und Rollen vergeben kommt mit dem Bereich Team in Phase 2.")).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Team" })).toHaveCount(0);
  await expectNoSeriousAxeFindings(page);

  // 6: Anbieter einladen.
  await sidebar.getByRole("link", { name: "Anbieter" }).click();
  await expect(page.getByText("Noch keine Anbieter")).toBeVisible();
  await expect(page.getByText("Nachrichten, Ausweisdaten und private Kalender der Anbieter sind für Organisationen nie zugänglich.", { exact: false })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await steps.click(page.getByRole("button", { name: "Einladen" }), "Einladen");
  const invite = page.getByRole("dialog", { name: "Anbieter einladen" });
  await invite.getByLabel("Profilname oder Profil-URL").fill(`${baseURL}/de/p/${provider.slug}`);
  await steps.click(invite.getByRole("combobox", { name: /Standort/ }), "Standort öffnen");
  await steps.click(page.getByRole("option", { name: "Journey Standort Langstrasse" }), "Standort wählen");
  await invite.getByLabel(/Nachricht/).fill("Fiktive Einladung aus Journey D.");
  await steps.click(invite.getByRole("button", { name: "Einladung senden" }), "Einladung senden");
  await expect(page.getByText("Einladung gesendet", { exact: true })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: provider.displayName });
  await expect(row.locator("[data-link-status]")).toHaveText("Eingeladen");
  await expectNoSeriousAxeFindings(page);
  expect(steps.count, `Bedienschritte bis zur Einladung: ${steps.toString()}`).toBeLessThanOrEqual(SETUP_STEPS);
  test.info().annotations.push({ type: "setup", description: `${steps.count} Schritte (${steps.toString()})` });

  // Vor der Zustimmung erscheint der Anbieter nicht auf der Clubseite.
  const guest = await visitor(browser, `/de/c/${organization.slug}`);
  await expect(guest.getByRole("heading", { level: 1, name: clubName })).toBeVisible();
  await expect(guest.locator("#inhalt")).not.toContainText(provider.displayName);

  // 7: Der Anbieter stimmt zu; erst dann zeigt die Clubseite sein Profil.
  const studio = await signedInPage(browser, provider, baseURL);
  await studio.goto("/de/studio/verknuepfungen");
  await expect(studio.getByRole("heading", { level: 1, name: "Verknüpfungen" })).toBeVisible();
  await expect(studio.getByText(/Nie deine Nachrichten, Ausweisdaten, Anfragen oder deinen Kalender/)).toBeVisible();
  await expectNoSeriousAxeFindings(studio);
  await studio.getByRole("button", { name: `Einladung von ${clubName} annehmen` }).click();
  await expect(studio.getByText(`Du bist jetzt mit ${clubName} verknüpft.`, { exact: true })).toBeVisible();
  await studio.context().close();

  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: provider.displayName }).locator("[data-link-status]")).toHaveText("Aktiv");
  await guest.reload();
  await expect(guest.locator("[data-club-providers]").getByRole("heading", { name: provider.displayName })).toBeVisible();
  await expectNoSeriousAxeFindings(guest);
  await guest.goto(`/de/c/${organization.slug}/standorte/${locationId}`);
  await expect(guest.getByRole("row", { name: /Freitag/ })).toContainText(/18:00.23:00/);
  await expect(guest.locator("[data-club-providers]").getByRole("heading", { name: provider.displayName })).toBeVisible();
  await expectNoSeriousAxeFindings(guest);
  await guest.goto(`/de/p/${provider.slug}`);
  await expect(guest.getByRole("region", { name: "Verknüpft mit" })).toContainText(clubName);
  await guest.context().close();
});
