import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { uniqueEmail } from "./support/outbox";
import { expect, test } from "./support/test";

/**
 * Onboarding für Anbieter (PRD 11.8, Entscheid 0009). Jeder Test legt ein
 * frisches, erkennbar fiktives Anbieterkonto direkt in der Datenbank an und
 * meldet sich über die Auth-API an; die gemeinsamen Testkonten bleiben unberührt.
 */
const PASSWORD = "nur-fuer-tests-0000";
const DESCRIPTION = "Fiktive Beschreibung für einen Test. Sie ist lang genug, damit die Mindestlänge erreicht ist.";

async function query<Row extends object>(sql: string, values: unknown[] = []): Promise<Row[]> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query<Row>(sql, values)).rows;
  } finally {
    await client.end();
  }
}

interface Provider {
  userId: string;
  profileId: string;
  email: string;
}

async function createProvider(status = "DRAFT"): Promise<Provider> {
  const userId = `e2e_${randomUUID()}`;
  const profileId = `e2e_${randomUUID()}`;
  const email = uniqueEmail("onboarding");
  await query(
    `insert into "user" (id, name, email, "emailVerified", "ageConfirmedAt", "accountType", "updatedAt") values ($1, 'Testkonto Fiktiv', $2, true, now(), 'PROVIDER', now())`,
    [userId, email],
  );
  await query(`insert into account (id, "accountId", "providerId", "userId", password, "updatedAt") values ($1, $2, 'credential', $2, $3, now())`, [
    `${userId}_credential`,
    userId,
    await hashPassword(PASSWORD),
  ]);
  await query(`insert into provider_profile (id, "userId", slug, "displayName", status, "updatedAt") values ($1, $2, $3, 'Beispielname Fiktiv', $4, now())`, [
    profileId,
    userId,
    `fiktiv-${randomUUID()}`,
    status,
  ]);
  return { userId, profileId, email };
}

async function signIn(page: Page, provider: Provider): Promise<void> {
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: { email: provider.email, password: PASSWORD },
  });
  expect(response.ok(), `Anmeldung ${response.status()}`).toBe(true);
}

/** Eine gültige Prüfung direkt in der Datenbank, für Tests, die nicht die Prüfung selbst prüfen. */
async function approveIdentity(provider: Provider, expiresInDays = 365): Promise<void> {
  await query(
    `insert into identity_check (id, "userId", provider, "externalRef", status, "ageOver18", "livenessPassed", "checkedAt", "expiresAt", "updatedAt")
     values ($1, $2, 'test', $3, 'APPROVED', true, true, now(), now() + ($4 || ' days')::interval, now())`,
    [`e2e_${randomUUID()}`, provider.userId, randomUUID(), String(expiresInDays)],
  );
}

async function fillBasics(provider: Provider): Promise<void> {
  const [region] = await query<{ id: string }>(`select id from region where slug = 'stadt-zuerich'`);
  await query(`insert into provider_region ("providerProfileId", "regionId") values ($1, $2)`, [provider.profileId, region?.id]);
  await query(`update provider_profile set description = $2, languages = '{de,en}', "onboardingSteps" = '{regions,profile}' where id = $1`, [
    provider.profileId,
    DESCRIPTION,
  ]);
}

async function profileStatus(provider: Provider): Promise<string | undefined> {
  return (await query<{ status: string }>(`select status from provider_profile where id = $1`, [provider.profileId]))[0]?.status;
}

/** Startet die Prüfung und wählt beim Test-Dienstleister das Ergebnis. */
async function runIdentityCheck(page: Page, outcome: "Bestanden" | "Abgelehnt" | "Nicht volljährig"): Promise<void> {
  await page.getByRole("button", { name: /Prüfung starten|Erneut prüfen/ }).click();
  await page.waitForURL(/\/de\/dev\/verifizierung\//);
  await expect(page.getByText("Test-Dienstleister, keine echte Prüfung")).toBeVisible();
  await page.getByRole("button", { name: outcome, exact: true }).click();
  await page.waitForURL(/\/de\/studio\/start\/identitaet$/);
}

const progress = (page: Page) => page.getByRole("navigation", { name: "Fortschritt der Profilerstellung" });

test.describe("Onboarding: Schritte (PRD 11.8)", () => {
  test("/studio führt zum ersten offenen Schritt, der Fortschritt zeigt acht Schritte mit Dauer", async ({ page }) => {
    const provider = await createProvider();
    await signIn(page, provider);
    await page.goto("/de/studio");
    await expect(page).toHaveURL(/\/de\/studio\/start\/identitaet$/);
    await expect(page.getByRole("heading", { level: 1, name: "Identität prüfen" })).toBeVisible();
    const steps = progress(page).getByRole("listitem");
    await expect(steps).toHaveCount(8);
    await expect(steps.first()).toHaveAttribute("aria-current", "step");
    await expect(steps.first()).toContainText("Identität, etwa 5 Minuten");
    await expect(steps.nth(1)).toContainText("offen");
    await expect(page.locator("#inhalt").getByText("keine Ausweiskopie")).toBeVisible();
  });

  test("Regionen wählen und speichern; nach dem Neuladen sind sie noch da", async ({ page }) => {
    const provider = await createProvider();
    await signIn(page, provider);
    await page.goto("/de/studio/start/regionen");
    await expect(page.getByText("Deine genaue Adresse wird nie veröffentlicht")).toBeVisible();
    await page.getByRole("button", { name: "Speichern und weiter" }).click();
    await expect(page.getByRole("alert").first()).toContainText("Wähle mindestens eine Region.");

    await page.getByRole("checkbox", { name: "Ganzer Kanton Bern" }).click();
    await page.getByRole("checkbox", { name: "Zürich", exact: true }).click();
    await expect(page.getByText("2 Regionen gewählt, höchstens 10")).toBeVisible();
    await page.getByRole("button", { name: "Speichern und weiter" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/start\/profil$/);

    await page.goto("/de/studio/start/regionen");
    await expect(page.getByRole("checkbox", { name: "Ganzer Kanton Bern" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Zürich", exact: true })).toBeChecked();
    await expect(progress(page).getByRole("listitem").nth(1)).toHaveAttribute("aria-current", "step");
    await page.goto("/de/studio/start/profil");
    await expect(progress(page).getByRole("listitem").nth(1)).toContainText("erledigt");
  });

  test("Profil: zu kurze Beschreibung zeigt den Fehler am Feld und oben", async ({ page }) => {
    const provider = await createProvider();
    await signIn(page, provider);
    await page.goto("/de/studio/start/profil");
    const description = page.getByLabel("Beschreibung");
    await description.fill("Zu kurz.");
    await description.blur();
    await expect(page.locator("#profil-beschreibung-error")).toHaveText("Die Beschreibung braucht mindestens 50 Zeichen.");
    await expect(description).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("8 von 4000 Zeichen")).toBeVisible();

    await page.getByRole("button", { name: "Speichern und weiter" }).click();
    await expect(page.getByRole("alert").first()).toContainText("Bitte prüfe diese Angaben");
    await expect(page.getByRole("alert").first().getByRole("link", { name: "Wähle mindestens eine Sprache." })).toBeVisible();
    await expect(description).toBeFocused();

    await description.fill(DESCRIPTION);
    await description.blur();
    await expect(page.locator("#profil-beschreibung-error")).toHaveCount(0);
    await page.getByRole("checkbox", { name: "Deutsch" }).click();
    await page.getByRole("button", { name: "Speichern und weiter" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/start\/medien$/);
    expect((await query<{ languages: string[] }>(`select languages from provider_profile where id = $1`, [provider.profileId]))[0]?.languages).toEqual(["de"]);
  });

  test("Identität über den Test-Dienstleister: abgelehnt mit Grund, dann bestanden mit Ablaufdatum", async ({ page }) => {
    const provider = await createProvider();
    await signIn(page, provider);
    await page.goto("/de/studio/start/identitaet");
    await expect(page.locator("[data-identity-status]")).toHaveAttribute("data-identity-status", "none");

    await runIdentityCheck(page, "Abgelehnt");
    await expect(page.locator("[data-identity-status]")).toContainText("Abgelehnt");
    await expect(page.locator("[data-identity-status]")).toContainText("Der Ausweis war nicht lesbar.");

    await runIdentityCheck(page, "Bestanden");
    const status = page.locator("[data-identity-status]");
    await expect(status).toHaveAttribute("data-identity-status", "valid");
    await expect(status).toContainText(/Gültig bis \d{2}\.\d{2}\.\d{4}/);
    await expect(progress(page).getByRole("listitem").first()).toContainText("aktueller Schritt");

    await page.getByRole("link", { name: "Verifizierung ansehen" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/verifizierung$/);
    await expect(page.locator("[data-identity-status]")).toHaveAttribute("data-identity-status", "valid");
  });
});

test.describe("Onboarding: Einreichen, Sperre und Korrektur (PRD 11.8, 16.1)", () => {
  test("ganzer Ablauf: überspringen, Preise, Vorschau, einreichen; danach «wird geprüft»", async ({ page }) => {
    const provider = await createProvider();
    await approveIdentity(provider);
    await fillBasics(provider);
    await signIn(page, provider);

    await page.goto("/de/studio/start/medien");
    await expect(page.getByText("neutrale Fläche")).toBeVisible();
    await page.getByRole("button", { name: "Schritt überspringen" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/start\/angebot$/);

    await expect(page.getByText("Noch keine Preise.")).toBeVisible();
    await page.getByRole("button", { name: "Preis hinzufügen" }).click();
    await page.locator("#angebot-preis-0").fill("300");
    await page.getByRole("button", { name: "Preis hinzufügen" }).click();
    await page.getByLabel("Dauer").nth(1).click();
    await page.getByRole("option", { name: "2 Stunden", exact: true }).click();
    await page.locator("#angebot-preis-1").fill("abc");
    await page.getByRole("button", { name: "Speichern und weiter" }).click();
    await expect(page.getByText("Gib den Preis als ganze Zahl in Franken ein.").first()).toBeVisible();
    await page.locator("#angebot-preis-1").fill("550");
    await page.locator("#angebot-hinweis-1").fill("Fiktiver Hinweis");
    await page.getByRole("button", { name: "Speichern und weiter" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/start\/verfuegbarkeit$/);

    await page.getByRole("button", { name: "Schritt überspringen" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/start\/vorschau$/);
    const preview = page.locator("[data-preview]");
    await expect(preview.getByRole("heading", { level: 3, name: "Beispielname Fiktiv" })).toBeVisible();
    await expect(preview).toContainText("Zürich");
    await expect(preview.getByRole("table")).toContainText("CHF 300");
    await expect(preview.getByRole("table")).toContainText("CHF 550");
    await expect(preview.getByRole("list", { name: "Vertrauenssignale" })).toContainText("Identität geprüft");
    await page.getByRole("button", { name: "Vorschau bestätigen" }).click();

    await expect(page).toHaveURL(/\/de\/studio\/start\/einreichen$/);
    await expect(page.getByText("Alles bereit.")).toBeVisible();
    await page.getByRole("button", { name: "Profil einreichen" }).click();
    await expect(page).toHaveURL(/\/de\/studio$/);
    await expect(page.locator("[data-todo=status]")).toContainText("Dein Profil wird geprüft");
    await expect(page.locator("[data-todo=status]")).toContainText("Wir prüfen eingereichte Profile von Hand");
    expect(await profileStatus(provider)).toBe("SUBMITTED");

    await page.goto("/de/studio/start/profil");
    await expect(page).toHaveURL(/\/de\/studio$/);
  });

  test("ohne Identitätsprüfung lässt sich nicht einreichen; die Seite verlinkt den Schritt", async ({ page }) => {
    const provider = await createProvider();
    await fillBasics(provider);
    await query(`update provider_profile set "onboardingSteps" = '{regions,profile,preview}' where id = $1`, [provider.profileId]);
    await signIn(page, provider);
    await page.goto("/de/studio/start/einreichen");
    const missing = page.locator("[data-missing-steps]");
    await expect(missing.getByRole("link", { name: "Identität ergänzen" })).toBeVisible();
    await page.getByRole("button", { name: "Profil einreichen" }).click();
    const alert = page.getByRole("alert").filter({ hasText: "noch nicht vollständig" });
    await expect(alert.getByRole("link", { name: "Identität ergänzen" })).toBeVisible();
    expect(await profileStatus(provider)).toBe("DRAFT");
    await alert.getByRole("link", { name: "Identität ergänzen" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/start\/identitaet$/);
  });

  test("«Nicht volljährig» sperrt das Profil sofort mit Erklärung", async ({ page }) => {
    const provider = await createProvider();
    await signIn(page, provider);
    await page.goto("/de/studio/start/identitaet");
    await runIdentityCheck(page, "Nicht volljährig");
    await expect(page.getByRole("heading", { level: 1, name: "Dein Profil ist gesperrt" })).toBeVisible();
    await expect(page.getByText("dass du nicht volljährig bist")).toBeVisible();
    expect(await profileStatus(provider)).toBe("SUSPENDED");
    await page.goto("/de/studio/start/regionen");
    await expect(page.getByRole("heading", { level: 1, name: "Dein Profil ist gesperrt" })).toBeVisible();
  });

  test("Rückgabe zur Korrektur: Grund pro Feld mit Link direkt zum Schritt", async ({ page }) => {
    const provider = await createProvider("CHANGES_REQUESTED");
    await approveIdentity(provider);
    await fillBasics(provider);
    const notes = {
      profile: "Fiktiver Grund: Beschreibung genauer fassen.",
      offer: "Fiktiver Grund: Preise ergänzen.",
    };
    await query(
      `insert into profile_review (id, "providerProfileId", "submittedAt", "decidedAt", decision, reason, rule, "fieldNotes") values ($1, $2, now(), now(), 'CHANGES_REQUESTED', 'Fiktive Begründung', 'Fiktive Regel', $3)`,
      [`e2e_${randomUUID()}`, provider.profileId, JSON.stringify(notes)],
    );
    await signIn(page, provider);
    await page.goto("/de/studio");
    await page.locator("[data-todo=status]").getByRole("link", { name: "Korrekturen ansehen" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/start\/profil$/);
    await expect(page.locator("[data-step-note]")).toHaveText(notes.profile);
    const summary = page.locator("[data-review-notes]");
    await expect(summary).toContainText(notes.offer);
    await summary.getByRole("link", { name: "Angebot und Preise bearbeiten" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/start\/angebot$/);
    await expect(page.locator("[data-step-note]")).toHaveText(notes.offer);
    await expect(page.locator("[data-review-notes]")).toContainText(notes.profile);
  });

  test("Heute warnt vor einer Verifizierung, die bald abläuft", async ({ page }) => {
    const provider = await createProvider("PUBLISHED");
    await approveIdentity(provider, 10);
    await signIn(page, provider);
    await page.goto("/de/studio");
    const entry = page.locator("[data-todo=verification]");
    await expect(entry).toContainText("Verifizierung läuft in 10 Tagen ab");
    await entry.getByRole("link", { name: "Verifizierung erneuern" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/verifizierung$/);
    await expect(page.locator("[data-identity-status]")).toContainText("Bestanden");
    await expect(page.getByRole("button", { name: "Erneut prüfen" })).toBeVisible();
  });
});

const STEP_SLUGS = ["identitaet", "regionen", "profil", "medien", "angebot", "verfuegbarkeit", "vorschau", "einreichen"] as const;

test.describe("Abnahme der Oberfläche im Onboarding", () => {
  test("alle Schritte, Verifizierung und Test-Dienstleister ohne schwere axe-Befunde, bei 320 px ohne horizontales Scrollen", async ({ page }) => {
    test.setTimeout(120_000);
    const provider = await createProvider();
    await approveIdentity(provider);
    await fillBasics(provider);
    await query(
      `insert into rate_item (id, "providerProfileId", "durationMinutes", "priceChf", note, "sortOrder", "updatedAt") values ($1, $2, 60, 300, 'Fiktiver Hinweis', 0, now())`,
      [`e2e_${randomUUID()}`, provider.profileId],
    );
    await signIn(page, provider);
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const slug of STEP_SLUGS) {
        await page.goto(`/de/studio/start/${slug}`);
        await expect(progress(page)).toBeVisible();
        await expectNoSeriousAxeFindings(page);
        await expectNoHorizontalScroll(page);
      }
      await page.goto("/de/studio/verifizierung");
      await expect(page.getByRole("heading", { level: 1, name: "Verifizierung" })).toBeVisible();
      await expectNoSeriousAxeFindings(page);
      await expectNoHorizontalScroll(page);
    }
  });

  test("auf Mobile zeigt das Formular keine Tab-Leiste; der Test-Dienstleister ist zugänglich", async ({ page }) => {
    const provider = await createProvider();
    await signIn(page, provider);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/de/studio/verifizierung");
    await expect(page.locator("[data-glass-tab-bar]")).toBeVisible();
    await page.goto("/de/studio/start/regionen");
    await expect(page.getByRole("heading", { level: 1, name: "Regionen wählen" })).toBeVisible();
    await expect(page.locator("[data-glass-tab-bar]")).toBeHidden();
    await expect(progress(page)).toContainText("Schritt 2 von 8: Regionen, etwa 1 Minute");

    await page.goto("/de/studio/start/identitaet");
    await page.getByRole("button", { name: "Prüfung starten" }).click();
    await page.waitForURL(/\/de\/dev\/verifizierung\//);
    await expectNoSeriousAxeFindings(page);
    await expectNoHorizontalScroll(page);
  });
});
