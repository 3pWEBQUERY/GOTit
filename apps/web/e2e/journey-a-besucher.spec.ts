import { cleanup } from "./admin-fixtures";
import { inboxRow, signedInPage, threadLog } from "./messages-fixtures";
import { keyword, searchProvider } from "./search-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { StepCounter, userIdByEmail } from "./support/journey";
import { uniqueEmail } from "./support/outbox";
import { confirmEmailFromOutbox, registerViaUi } from "./support/register";
import { indexProfiles } from "./support/search-index";
import { expect, test } from "./support/test";

/**
 * Journey A, «Besucher entdeckt einen Anbieter» (PRD v1 17, v2 Schritt 1.14).
 * Ein Ablauf durch die echte Oberfläche, vom Öffnen der Startseite bis zur
 * Antwort des Anbieters:
 *
 *  1. Startseite öffnen            → Weiterleitung zur Altersprüfung
 *  2. Altersprüfung                → «Alter bestätigen», zurück auf Entdecken
 *  3. Nach Region suchen           → «Basel · Region» im Feld «Ort oder Name»
 *  4. Ergebnisse                   → /suche?ort=basel mit der Karte des Profils
 *  5. Filter ändern                → Sprache «Italienisch», Chip und URL
 *  6. Profil öffnen                → Karte antippen, /p/[name]
 *  7. Vertrauenssignale            → «Identität geprüft» mit Erklärung
 *  8. Registrieren bei Bedarf      → «Nachricht schreiben» → Anmeldung → «Konto
 *                                    erstellen» mit ?weiter → E-Mail bestätigen
 *                                    → «Weiter, wo du warst» führt zum Profil
 *  9. Kontakt                      → «Nachricht schreiben», Nachricht senden
 * 10. Anbieter entscheidet frei    → sieht die Nachricht ungelesen im Studio und
 *                                    antwortet; die Antwort kommt beim Mitglied an
 *
 * Erfolgsziel «Schnelle Discovery ohne unnötige Schritte»: Von der Startseite
 * bis zur Profilseite braucht es höchstens DISCOVERY_STEPS Bedienschritte
 * (Alter bestätigen, Region wählen, Filter setzen, Profil öffnen). Tippen zählt
 * nicht, jede Auswahl und jeder Klick schon. Zusätzlich: höchstens
 * CONTACT_STEPS Schritte vom Profil bis zur gesendeten ersten Nachricht,
 * Registrierung eingeschlossen: «Nachricht schreiben», «Konto erstellen», im
 * Formular Typ, zwei Kästchen und Senden, Link in der E-Mail, «Weiter, wo du
 * warst», «Nachricht schreiben», «Nachricht senden».
 *
 * Testdaten: Nur der Anbieter entsteht per SQL (die Gegenseite ist nicht Teil
 * der Journey), mit eigenem Kennwort im Namen und Region Basel, in der sonst
 * kein Spec Profile anlegt. Das Mitglied entsteht über die Registrierung; der
 * Bestätigungslink kommt aus dem Ausgang, wie in auth-register.spec.ts.
 */
const DISCOVERY_STEPS = 4;
const CONTACT_STEPS = 10;

const created: string[] = [];
test.afterAll(async () => cleanup(created));
test.use({ viewport: { width: 1280, height: 900 } });

test("Journey A: Startseite → Altersprüfung → Region → Filter → Profil → Registrierung → Nachricht → Antwort", async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000);
  const word = keyword();
  const provider = await searchProvider(created, word, { region: "basel", languages: ["it", "de"], price: 280 });
  await indexProfiles([provider.profileId]);
  const discovery = new StepCounter();
  const started = Date.now();

  // 1–2: Startseite, Altersprüfung.
  await page.goto("/de");
  await expect(page).toHaveURL(/\/de\/alterspruefung\?weiter=%2Fde$/);
  await expectNoSeriousAxeFindings(page);
  await discovery.click(page.getByRole("button", { name: "Alter bestätigen" }), "Alter bestätigen");
  await expect(page).toHaveURL(/\/de$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Profile in |Entdecken)/);
  await expectNoSeriousAxeFindings(page);

  // 3–4: Region im Suchfeld wählen, Ergebnisse unter /suche.
  const box = page.getByRole("combobox", { name: "Ort oder Name" });
  await box.fill("Basel");
  await discovery.click(page.getByRole("option", { name: "Basel · Region", exact: true }), "Region «Basel» wählen");
  await expect(page).toHaveURL(/\/de\/suche\?ort=basel$/);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(/^\d+ Profile? in Basel$/);
  const card = page.locator("#inhalt [data-search-results] > li").filter({ hasText: provider.name });
  await expect(card).toBeVisible();
  await expectNoSeriousAxeFindings(page);

  // 5: Filter ändern.
  const panel = page.getByRole("complementary", { name: "Filter" });
  const italian = panel.getByRole("checkbox", { name: "Italienisch" });
  await discovery.click(italian, "Filter «Italienisch»");
  await expect(page).toHaveURL(/sprache=it/);
  await expect(italian).toBeChecked();
  await expect(page.getByRole("group", { name: "Aktive Filter" })).toContainText("Italienisch");
  await expect(heading).toHaveText(/^\d+ Profile? in Basel$/);
  await expect(card).toBeVisible();

  // 6–7: Profil öffnen, Profilinformationen und Vertrauenssignale.
  await discovery.click(card.getByRole("link").first(), "Profil öffnen");
  await expect(page).toHaveURL(new RegExp(`/de/p/${provider.slug}$`));
  const discoveryMs = Date.now() - started;
  await expect(page.getByRole("heading", { level: 1, name: provider.name })).toBeVisible();
  await expect(page.locator("#inhalt").getByText(/Basel · spricht/)).toBeVisible();
  await expect(page.getByRole("table")).toContainText("CHF 280");
  const signals = page.getByRole("list", { name: "Vertrauenssignale" });
  await expect(signals).toContainText("Identität geprüft");
  await page.getByRole("button", { name: "Erklärung zu «Identität geprüft» anzeigen" }).click();
  await expect(page.getByRole("dialog", { name: "Identität geprüft" })).toContainText("Was das Signal nicht aussagt");
  await page.keyboard.press("Escape");
  await expectNoSeriousAxeFindings(page);

  // Erfolgsziel: schnelle Discovery.
  expect(discovery.count, `Bedienschritte bis zum Profil: ${discovery.toString()}`).toBeLessThanOrEqual(DISCOVERY_STEPS);
  test.info().annotations.push({ type: "discovery", description: `${discovery.count} Schritte, ${discoveryMs} ms (${discovery.toString()})` });

  // 8: Registrieren bei Bedarf, mit Rückweg zum Profil.
  const contact = new StepCounter();
  const profileUrl = page.url();
  await contact.click(page.locator("[data-contact-bar=panel]").getByRole("link", { name: "Nachricht schreiben" }), "Nachricht schreiben (Besucher)");
  await expect(page).toHaveURL(/\/de\/anmelden\?weiter=/);
  await expectNoSeriousAxeFindings(page);
  await contact.click(page.getByRole("link", { name: "Konto erstellen" }), "Konto erstellen");
  await expect(page).toHaveURL(new RegExp(`/de/registrieren\\?weiter=%2Fde%2Fp%2F${provider.slug}`));
  const email = uniqueEmail("journey-a");
  await registerViaUi(page, { type: "Mitglied", name: "Journey-Mitglied Fiktiv", email }, { stay: true });
  // Konto-Typ, Alter, Bedingungen und «Konto erstellen» sind vier Schritte im Formular.
  contact.steps.push("Typ «Mitglied»", "Alter bestätigen", "Bedingungen akzeptieren", "Konto erstellen (senden)");
  created.push(await userIdByEmail(email));
  await expectNoSeriousAxeFindings(page);
  await confirmEmailFromOutbox(page, email);
  contact.steps.push("Link in der E-Mail öffnen");
  await expectNoSeriousAxeFindings(page);
  const back = page.getByRole("link", { name: "Weiter, wo du warst" });
  await expect(back).toHaveAttribute("href", `/de/p/${provider.slug}`);
  await contact.click(back, "Weiter, wo du warst");
  await expect(page).toHaveURL(profileUrl);

  // 9: Kontakt herstellen, jetzt angemeldet.
  await contact.click(page.locator("[data-contact-bar=panel]").getByRole("button", { name: "Nachricht schreiben" }), "Nachricht schreiben (Mitglied)");
  await expect(page).toHaveURL(/\/de\/nachrichten\/[^/?]+$/);
  const conversationId = page.url().split("/").pop() ?? "";
  const composer = page.getByRole("textbox", { name: `Nachricht an ${provider.name}` });
  await composer.fill("Guten Tag, ich habe Ihr Profil gefunden. Haben Sie nächste Woche Zeit?");
  await contact.click(page.getByRole("button", { name: "Nachricht senden" }), "Nachricht senden");
  const own = threadLog(page).getByRole("listitem").filter({ hasText: "ich habe Ihr Profil gefunden" });
  await expect(own).toContainText("Gesendet");
  await expectNoSeriousAxeFindings(page);
  expect(contact.count, `Bedienschritte vom Profil bis zur Nachricht: ${contact.toString()}`).toBeLessThanOrEqual(CONTACT_STEPS);
  test.info().annotations.push({ type: "contact", description: `${contact.count} Schritte (${contact.toString()})` });

  // 10: Der Anbieter sieht die Anfrage im Studio und entscheidet frei; hier antwortet er.
  const studio = await signedInPage(browser, provider.account, baseURL);
  await studio.goto("/de/studio/nachrichten");
  await expect(studio.getByRole("heading", { level: 1, name: "Nachrichten" })).toBeVisible();
  const row = inboxRow(studio, "Mitglied seit");
  await expect(row).toContainText("ich habe Ihr Profil gefunden");
  await expect(row.getByRole("link")).toContainText("1 ungelesene Nachricht");
  await expect(studio.locator("[data-studio-sidebar]").getByRole("link", { name: "Nachrichten, 1 ungelesen", exact: true })).toBeVisible();
  await expectNoSeriousAxeFindings(studio);
  await row.getByRole("link").click();
  await expect(studio).toHaveURL(new RegExp(`/de/studio/nachrichten/${conversationId}$`));
  await expect(threadLog(studio)).toContainText("ich habe Ihr Profil gefunden");
  // Freiwillig: Antworten, Blockieren und Melden stehen gleichwertig zur Wahl.
  const details = studio.getByRole("complementary", { name: "Details zur Unterhaltung" });
  await expect(details.getByRole("button", { name: "Kontakt blockieren" })).toBeVisible();
  await expect(details.getByRole("button", { name: "Mitglied melden" })).toBeVisible();
  const reply = studio.getByRole("textbox", { name: /^Nachricht an Mitglied seit/ });
  await expect(reply).toBeVisible();
  await expectNoSeriousAxeFindings(studio);
  await reply.fill("Gern, Dienstag ab 18 Uhr ist möglich.");
  await reply.press("Enter");
  await expect(threadLog(page)).toContainText("Gern, Dienstag ab 18 Uhr ist möglich.", { timeout: 15_000 });
  await studio.context().close();
});
