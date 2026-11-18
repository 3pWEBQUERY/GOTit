import type { Browser } from "@playwright/test";
import { cleanup, query } from "./admin-fixtures";
import { bookingCard, choose, createBookableProvider, dayLabel, requestStatus, zurichDay } from "./booking-fixtures";
import { createMember, signedInPage } from "./messages-fixtures";
import { REVIEW_TEXT } from "./reviews-fixtures";
import { visitor } from "./search-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { adminPage, StepCounter } from "./support/journey";
import { mailBySubject } from "./support/outbox";
import { expect, test } from "./support/test";

/**
 * Journey C, «Kunde organisiert einen Termin» (PRD v1 17, v2 8, Schritt 1.14).
 * Ein Ablauf durch die echte Oberfläche, beide Seiten in eigenen Kontexten:
 *
 *  1. Profil aufrufen              → Mitglied öffnet /p/[name]
 *  2. Verfügbarkeit prüfen         → «Termin anfragen»: nur freie Tage und Zeiten sind wählbar
 *  3. Terminanfrage senden         → Tag, Zeit, Dauer, Region, Nachricht, «Anfrage senden»
 *  4. Anbieter wird benachrichtigt → E-Mail «Neue Terminanfrage» mit Link (Ausgang), «Heute» zählt
 *                                    die offene Anfrage («1 Terminanfrage wartet auf Antwort») mit
 *                                    Link, Tab «Offen» unter /studio/anfragen. Ein Zähler an
 *                                    «Anfragen» oder eine Glocke gibt es noch nicht: /benachrichtigungen
 *                                    kommt mit dem Benachrichtigungsmodul (Übergabe 1.11, Punkt 4).
 *  5. Zeitpunkt abstimmen          → Gegenvorschlag des Anbieters, E-Mail «Neuer Terminvorschlag»
 *                                    an das Mitglied, das ihn annimmt
 *  6. Bestätigt                    → «Bestätigt» bei beiden, im Kalender und als Karte im Verlauf
 *  7. Verwalten oder absagen       → «Termin absagen» bei beiden, Unterhaltung verlinkt, Kalender
 *  8. Nach dem Zeitpunkt           → Anbieter markiert «Stattgefunden»
 *  9. Moderierte Bewertung         → Mitglied schreibt, Moderation gibt in /admin/bewertungen frei,
 *                                    sichtbar unter /p/[name]/bewertungen
 *
 * Einzige Abkürzung über die Datenbank: Nach der Bestätigung wird der Termin in
 * die Vergangenheit verschoben, weil Zeit im Test nicht vergehen kann
 * («Stattgefunden» setzt ein vergangenes Ende voraus). Mitglied und Anbieter
 * sind frische Konten aus den Fixtures (Registrierung und Onboarding prüfen
 * Journey A und B); die Moderation ist ein frisches Admin-Konto mit 2FA.
 *
 * Erfolgsziel «Terminorganisation ohne separate Kalender- und Messenger-Anwendungen»:
 * Anfrage, Gegenvorschlag, Bestätigung und Bewertung laufen über dieselbe Unterhaltung
 * (Karte im Verlauf beider Seiten) und denselben Kalender, und das Mitglied braucht
 * höchstens REQUEST_STEPS Bedienschritte vom Profil bis zur gesendeten Anfrage («Termin
 * anfragen», Tag, Uhrzeit und Region je öffnen und wählen, «Anfrage senden»; die Dauer
 * ist vorgewählt, die Nachricht ist Tippen).
 */
const REQUEST_STEPS = 8;
const created: string[] = [];
test.afterAll(async () => cleanup(created));
test.use({ viewport: { width: 1280, height: 900 } });

/** Schritt 9, zweite Hälfte: Die Moderation gibt die Bewertung frei, danach steht sie auf dem Profil. */
async function moderateAndShow(
  browser: Browser,
  baseURL: string | undefined,
  { reviewId, slug, displayName, authorName }: { reviewId: string; slug: string; displayName: string; authorName: string },
): Promise<void> {
  const admin = await adminPage(browser, baseURL, "MODERATOR", created);
  await admin.goto("/de/admin/bewertungen");
  await expect(admin.getByRole("heading", { level: 1, name: "Bewertungen" })).toBeVisible();
  await expectNoSeriousAxeFindings(admin);
  await admin.locator(`[data-review-case-link][href="/de/admin/bewertungen/${reviewId}"]`).filter({ visible: true }).click();
  await expect(admin.getByRole("heading", { level: 1, name: `Bewertung zu ${displayName}` })).toBeVisible();
  await expect(admin.getByText(/bis .* · Stattgefunden/)).toBeVisible();
  await expectNoSeriousAxeFindings(admin);
  await admin.getByRole("radio", { name: "Freigeben" }).click();
  await choose(admin, "Regel", /^R-REV-1 /);
  await admin.getByLabel("Begründung", { exact: true }).fill("Fiktiv: sachlich, ohne sensible Details.");
  await admin.getByRole("button", { name: "Entscheid speichern" }).click();
  await expect(admin).not.toHaveURL(`/de/admin/bewertungen/${reviewId}`);
  await expect.poll(async () => (await query<{ status: string }>(`select status::text as status from review where id = $1`, [reviewId]))[0]?.status).toBe("PUBLISHED");
  await admin.context().close();

  const guest = await visitor(browser, `/de/p/${slug}`);
  await expect(guest.getByRole("navigation", { name: "Bereiche des Profils" }).getByRole("link", { name: "Bewertungen 1" })).toBeVisible();
  await guest.goto(`/de/p/${slug}/bewertungen`);
  const item = guest.locator(`[data-review="${reviewId}"]`);
  await expect(item).toContainText("Nach bestätigtem Termin");
  await expect(item).toContainText(REVIEW_TEXT);
  expect(await guest.content()).not.toContain(authorName);
  await expectNoSeriousAxeFindings(guest);
  await guest.context().close();
}

test("Journey C: Profil → Verfügbarkeit → Anfrage → Gegenvorschlag → bestätigt → Stattgefunden → Bewertung freigegeben", async ({ browser, baseURL }) => {
  test.setTimeout(240_000);
  const day = zurichDay(3).day;
  const later = zurichDay(4).day;
  const provider = await createBookableProvider(created);
  const member = await createMember(created);
  const page = await signedInPage(browser, member, baseURL);
  const steps = new StepCounter();

  // 1: Profil aufrufen.
  await page.goto(`/de/p/${provider.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: provider.displayName })).toBeVisible();
  await expectNoSeriousAxeFindings(page);

  // 2: Verfügbarkeit prüfen: nur freie Tage, nur Zeiten im Fenster 10–22 Uhr.
  await steps.click(page.locator("[data-contact-bar=panel]").getByRole("link", { name: "Termin anfragen" }), "Termin anfragen");
  await expect(page).toHaveURL(new RegExp(`/de/p/${provider.slug}/anfrage$`));
  const panel = page.getByRole("dialog", { name: `Termin anfragen bei ${provider.displayName}` });
  await expect(panel).toContainText(`Unverbindlich. ${provider.displayName} entscheidet frei`);
  await steps.click(panel.getByRole("combobox", { name: "Tag" }), "Tag öffnen");
  await expect(page.getByRole("option", { name: dayLabel(zurichDay(1).day) })).toBeVisible();
  await steps.click(page.getByRole("option", { name: dayLabel(day) }), "Tag wählen");
  await steps.click(panel.getByRole("combobox", { name: "Uhrzeit" }), "Uhrzeit öffnen");
  await expect(page.getByRole("option", { name: "09:30" })).toHaveCount(0);
  await steps.click(page.getByRole("option", { name: "18:00" }), "Uhrzeit wählen");
  // Eine Stunde ist vorgewählt; kein Schritt nötig.
  await expect(panel.getByRole("combobox", { name: "Dauer" })).toContainText("1 Std.");
  await choose(page, "Region", "Zürich");
  steps.steps.push("Region öffnen", "Region wählen");
  await panel.getByRole("textbox", { name: /Nachricht/ }).fill("Fiktive Anfrage aus Journey C, gern mit kurzer Rückmeldung.");
  await expectNoSeriousAxeFindings(page);

  // 3: Anfrage senden.
  await steps.click(panel.getByRole("button", { name: "Anfrage senden" }), "Anfrage senden");
  await expect(panel.getByText("Anfrage gesendet")).toBeVisible();
  expect(steps.count, `Bedienschritte bis zur Anfrage: ${steps.toString()}`).toBeLessThanOrEqual(REQUEST_STEPS);
  test.info().annotations.push({ type: "request", description: `${steps.count} Schritte (${steps.toString()})` });
  const [row] = await query<{ id: string; conversationId: string }>(`select id, "conversationId" from booking_request where "memberUserId" = $1`, [member.id]);
  const requestId = row?.id ?? "";
  const conversationId = row?.conversationId ?? "";
  await expect(panel.getByRole("link", { name: "Anfrage ansehen" })).toHaveAttribute("href", `/de/termine/${requestId}`);

  // 4: Der Anbieter wird benachrichtigt (E-Mail, Heute, Zähler) und öffnet die Anfrage über den Link.
  const mail = await mailBySubject(provider.email, "Neue Terminanfrage");
  expect(mail.text).not.toContain(member.name);
  const studio = await signedInPage(browser, provider, baseURL);
  await studio.goto("/de/studio");
  const todo = studio.getByRole("region", { name: "Zu erledigen" });
  await expect(todo.locator('[data-todo="requests"]')).toContainText("1 Terminanfrage wartet auf Antwort");
  await expect(todo.locator('[data-todo="requests"]').getByRole("link", { name: /^Anfrage für / })).toHaveAttribute("href", `/de/studio/anfragen/${requestId}`);
  await expectNoSeriousAxeFindings(studio);
  await studio.goto("/de/studio/anfragen");
  await expect(studio.locator(`[data-request-row="${requestId}"]`)).toContainText("Angefragt");
  await expectNoSeriousAxeFindings(studio);
  await studio.goto(mail.link);
  await expect(studio).toHaveURL(new RegExp(`/de/studio/anfragen/${requestId}$`));
  await expect(studio.getByRole("heading", { level: 1, name: "Terminanfrage von Mitglied" })).toBeVisible();
  await expect(studio.locator("[data-request-detail]")).toHaveAttribute("data-status", "REQUESTED");
  await expectNoSeriousAxeFindings(studio);

  // 5: Zeitpunkt abstimmen: Gegenvorschlag am Folgetag um 19:30.
  await studio.getByRole("button", { name: "Gegenvorschlag machen" }).click();
  const counter = studio.locator("[data-counter-form]");
  const [y, m, d] = later.split("-");
  await counter.getByRole("textbox", { name: "Tag" }).fill(`${d}.${m}.${y}`);
  await counter.getByRole("textbox", { name: "Beginn" }).fill("19:30");
  await counter.getByRole("textbox", { name: "Beginn" }).blur();
  await counter.getByRole("button", { name: "Gegenvorschlag senden" }).click();
  await expect(studio.getByText("Gegenvorschlag gesendet", { exact: true })).toBeVisible();
  await expect(studio.locator("[data-request-detail]")).toHaveAttribute("data-status", "NEGOTIATING");

  const proposal = await mailBySubject(member.email, "Neuer Terminvorschlag");
  await page.goto(proposal.link);
  await expect(page).toHaveURL(new RegExp(`/de/termine/${requestId}$`));
  await expect(page.getByText(`Neuer Vorschlag von ${provider.displayName}`)).toBeVisible();
  await expect(page.getByText(`${dayLabel(later)}, 19:30–20:30`).first()).toBeVisible();
  await expectNoSeriousAxeFindings(page);
  await page.getByRole("button", { name: "Vorschlag annehmen" }).click();

  // 6: Bestätigt für beide Seiten, im Verlauf und im Kalender.
  await expect(page.locator("header").getByText("Bestätigt")).toBeVisible();
  expect(await requestStatus(requestId)).toBe("CONFIRMED");
  await studio.reload();
  await expect(studio.locator("[data-request-detail]")).toHaveAttribute("data-status", "CONFIRMED");
  await studio.goto(`/de/studio/nachrichten/${conversationId}`);
  await expect(bookingCard(studio, requestId)).toContainText("Bestätigt");
  await expect(bookingCard(studio, requestId)).toContainText(`${dayLabel(later)}, 19:30–20:30`);
  await expectNoSeriousAxeFindings(studio);
  await studio.goto(`/de/studio/kalender?ansicht=woche&datum=${later}`);
  const confirmedEntry = studio.locator("[data-calendar]").getByRole("table").locator("[data-kind=confirmed]");
  await expect(confirmedEntry).toHaveCount(1);
  await expect(confirmedEntry).toContainText("Bestätigt");
  await expectNoSeriousAxeFindings(studio);

  // 7: Beide können verwalten oder absagen.
  await expect(page.getByRole("button", { name: "Termin absagen" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Unterhaltung öffnen" })).toHaveAttribute("href", `/de/nachrichten/${conversationId}`);
  await expectNoSeriousAxeFindings(page);
  await page.goto(`/de/nachrichten/${conversationId}`);
  await expect(bookingCard(page, requestId)).toContainText("Bestätigt");
  await page.goto("/de/termine?ansicht=bestaetigt");
  await expect(page.locator("[data-booking-list]")).toContainText(provider.displayName);
  await expectNoSeriousAxeFindings(page);
  await studio.goto(`/de/studio/anfragen/${requestId}`);
  await expect(studio.getByRole("button", { name: "Termin absagen" })).toBeVisible();
  await expect(studio.getByRole("button", { name: "Aus Sicherheitsgründen absagen" })).toBeVisible();

  // 8: Nach dem Zeitpunkt. Einzige Abkürzung: Der Termin wird in die Vergangenheit verschoben (Ende vor zwei Stunden).
  await query(`update booking_request set "startsAt" = now() - interval '3 hours', "endsAt" = now() - interval '2 hours' where id = $1`, [requestId]);
  await studio.reload();
  await studio.getByRole("button", { name: "Als stattgefunden markieren" }).click();
  await expect(studio.getByText("Als stattgefunden markiert", { exact: true })).toBeVisible();
  await expect(studio.locator("[data-request-detail]")).toHaveAttribute("data-status", "COMPLETED");
  expect(await requestStatus(requestId)).toBe("COMPLETED");

  // 9: Moderierte Bewertung.
  await page.goto("/de/termine?ansicht=vergangen");
  await page.getByRole("link", { name: `Bewertung schreiben für ${provider.displayName}` }).click();
  await expect(page).toHaveURL(`/de/bewertungen/neu/${requestId}`);
  await expect(page.getByRole("heading", { level: 1, name: `Bewertung für ${provider.displayName}` })).toBeVisible();
  await expectNoSeriousAxeFindings(page);
  for (const [category, value] of [
    ["Kommunikation", 5],
    ["Zuverlässigkeit der Profilangaben", 5],
    ["Organisation", 4],
    ["Gesamteindruck", 5],
  ] as const)
    await page.getByRole("radio", { name: `${category}, ${value} von 5` }).click();
  await page.getByRole("textbox", { name: "Deine Erfahrung" }).fill(REVIEW_TEXT);
  await page.getByRole("button", { name: "Bewertung senden" }).click();
  await expect(page).toHaveURL("/de/bewertungen?gesendet=1");
  await expect(page.locator("[data-own-review]")).toContainText("Wird geprüft");
  await expectNoSeriousAxeFindings(page);
  const [review] = await query<{ id: string }>(`select id from review where "bookingRequestId" = $1`, [requestId]);
  const reviewId = review?.id ?? "";

  await moderateAndShow(browser, baseURL, { reviewId, slug: provider.slug, displayName: provider.displayName, authorName: member.name });
  await studio.context().close();
});
