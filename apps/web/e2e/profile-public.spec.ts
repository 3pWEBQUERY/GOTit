import { randomUUID } from "node:crypto";
import type { Browser, Page } from "@playwright/test";
import { cleanup, createAccount, query } from "./admin-fixtures";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { confirmAge } from "./support/session";
import { expect, test } from "./support/test";

/**
 * Öffentliche Profilseite `/p/[name]` (PRD v2 10, Entscheid 0012). Jeder Test
 * legt ein frisches, erkennbar fiktives Profil per SQL an: freigegeben heisst
 * Status, gültige Identitätsprüfung und freigegebene Erstprüfung.
 */
interface ProviderOptions {
  status?: "PUBLISHED" | "PAUSED" | "SUBMITTED" | "SUSPENDED" | "RESTRICTED";
  identity?: "valid" | "expired";
  review?: "APPROVED" | "open";
  visibility?: "PUBLIC" | "MEMBERS";
  rates?: boolean;
}

interface Provider {
  userId: string;
  slug: string;
  name: string;
}

const created: string[] = [];
test.afterAll(async () => cleanup(created));

const DESCRIPTION = "Fiktive Beschreibung für einen Test der Profilseite. Sie ist lang genug für die Regel.";

async function provider(options: ProviderOptions = {}): Promise<Provider> {
  const suffix = randomUUID().slice(0, 8);
  const name = `Profilname ${suffix} Fiktiv`;
  const account = await createAccount(undefined, `Profilkonto ${suffix} Fiktiv`);
  created.push(account.id);
  const profileId = `e2e_profil_${suffix}`;
  const slug = `fiktiv-${suffix}`;
  await query(
    `insert into provider_profile (id, "userId", slug, "displayName", status, visibility, description, "shortDescription", languages, "publishedAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, 'Ein fiktiver Satz unter dem Namen.', '{de,en}', now(), now())`,
    [profileId, account.id, slug, name, options.status ?? "PUBLISHED", options.visibility ?? "PUBLIC", DESCRIPTION],
  );
  const [region] = await query<{ id: string }>(`select id from region where slug = 'stadt-zuerich'`);
  await query(`insert into provider_region ("providerProfileId", "regionId") values ($1, $2)`, [profileId, region?.id]);
  if (options.rates !== false) {
    await query(`insert into rate_item (id, "providerProfileId", "durationMinutes", "priceChf", "sortOrder", "updatedAt") values ($1, $2, 60, 300, 0, now())`, [`e2e_rate_${suffix}`, profileId]);
  }
  const expires = options.identity === "expired" ? "now() - interval '2 days'" : "now() + interval '300 days'";
  await query(
    `insert into identity_check (id, "userId", provider, "externalRef", status, "ageOver18", "livenessPassed", "checkedAt", "expiresAt", "updatedAt")
     values ($1, $2, 'test', $3, 'APPROVED', true, true, now() - interval '20 days', ${expires}, now())`,
    [`e2e_identity_${suffix}`, account.id, `e2e-ref-${randomUUID()}`],
  );
  const approved = (options.review ?? "APPROVED") === "APPROVED";
  await query(`insert into profile_review (id, "providerProfileId", "submittedAt", decision, "decidedAt") values ($1, $2, now() - interval '21 days', $3, $4)`, [
    `e2e_review_${suffix}`,
    profileId,
    approved ? "APPROVED" : null,
    approved ? new Date() : null,
  ]);
  return { userId: account.id, slug, name };
}

/** Besucher mit bestätigter Altersprüfung, in einem eigenen Kontext. */
async function visitor(browser: Browser, path: string, viewport?: { width: number; height: number }): Promise<Page> {
  const context = await browser.newContext(viewport ? { viewport } : {});
  const page = await context.newPage();
  await confirmAge(page, path);
  return page;
}

test.describe("Profilseite: öffentlich (PRD v2 10)", () => {
  test("nach der Altersprüfung: Name, Region, Signale mit Erklärung, Preise mit Stand, neutrale Fläche", async ({ page }) => {
    const { slug, name } = await provider();
    await page.goto(`/de/p/${slug}`);
    await expect(page).toHaveURL(/alterspruefung/);
    await page.getByRole("button", { name: "Alter bestätigen" }).click();
    await expect(page).toHaveURL(new RegExp(`/de/p/${slug}$`));

    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Brotkrumen" })).toContainText("Entdecken");
    await expect(page.getByRole("navigation", { name: "Brotkrumen" })).toContainText("Zürich");
    await expect(page.locator("#inhalt").getByText("Zürich · spricht Deutsch und Englisch")).toBeVisible();
    const signals = page.getByRole("list", { name: "Vertrauenssignale" });
    await expect(signals).toContainText("Identität geprüft");
    await expect(signals).not.toContainText("Fotos geprüft");
    await page.getByRole("button", { name: "Erklärung zu «Identität geprüft» anzeigen" }).click();
    await expect(page.getByRole("dialog", { name: "Identität geprüft" })).toContainText("Was das Signal nicht aussagt");
    await page.keyboard.press("Escape");

    await expect(page.getByRole("heading", { level: 2, name: "Über mich" })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("CHF 300");
    await expect(page.getByText(/^Stand: \d{2}\.\d{2}\.\d{4}$/)).toBeVisible();
    await expect(page.locator("[data-media-placeholder]")).toBeVisible();
    await expect(page.locator("[data-contact-bar=panel]")).toContainText("Terminanfragen sind mit der nächsten Version");
    await expect(page.locator("[data-contact-bar=panel]").getByRole("button")).toHaveCount(0);
    // «Nachricht schreiben» führt Besucher zur Anmeldung und zurück (Entscheid 0014).
    await expect(page.locator("[data-contact-bar=panel]").getByRole("link", { name: "Nachricht schreiben" })).toHaveAttribute("href", /\/de\/anmelden\?weiter=/);
    await expect(page.locator("[data-contact-bar=panel]").getByRole("link", { name: "Profil melden" })).toHaveAttribute("href", "/de/melden");
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", new RegExp(`/de/p/${slug}$`));
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator("[data-owner-bar]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Bewertungen|Verfügbarkeit|Verknüpft/ })).toHaveCount(0);
    expect(await page.content()).not.toContain("@fiktiv.test");
    await expectNoSeriousAxeFindings(page);
  });

  test("ohne Preise steht «Preise auf Anfrage», keine leere Tabelle", async ({ browser }) => {
    const { slug } = await provider({ rates: false });
    const page = await visitor(browser, `/de/p/${slug}`);
    await expect(page.getByText("Preise auf Anfrage")).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  test("nicht freigegeben, gesperrt oder abgelaufene Identität: 404", async ({ browser }) => {
    const cases = await Promise.all([provider({ status: "SUBMITTED", review: "open" }), provider({ status: "SUSPENDED" }), provider({ identity: "expired" })]);
    const page = await visitor(browser, "/de");
    for (const { slug } of cases) {
      const response = await page.goto(`/de/p/${slug}`);
      expect(response?.status(), slug).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).not.toContainText("Profilname");
    }
    expect((await page.goto("/de/p/gibt-es-nicht-fiktiv"))?.status()).toBe(404);
  });

  test("pausiert: Hinweis ohne Kontakt, noindex", async ({ browser }) => {
    const { slug, name } = await provider({ status: "PAUSED" });
    const page = await visitor(browser, `/de/p/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.locator("[data-contact-bar=panel]")).toContainText("Dieses Profil ist zurzeit pausiert");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("eingeschränkt: sichtbar, ohne Kontakt", async ({ browser }) => {
    const { slug, name } = await provider({ status: "RESTRICTED" });
    const page = await visitor(browser, `/de/p/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.locator("[data-contact-bar=panel]")).toContainText("Kontakt über die Plattform ist für dieses Profil zurzeit nicht möglich.");
  });

  test("nur für Mitglieder: Besucher sehen den Hinweis und den Weg zur Anmeldung", async ({ browser }) => {
    const { slug, name } = await provider({ visibility: "MEMBERS" });
    const page = await visitor(browser, `/de/p/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText("Dieses Profil sehen nur angemeldete Mitglieder.")).toBeVisible();
    await expect(page.getByText(DESCRIPTION)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Anmelden" }).last()).toHaveAttribute("href", /weiter=/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectNoSeriousAxeFindings(page);
  });

  test("Mobile 320 px: kein horizontales Scrollen, Kontaktleiste statt Tab-Leiste; Tab «Medien» ohne Medien, noindex", async ({ browser }) => {
    const { slug } = await provider();
    const page = await visitor(browser, `/de/p/${slug}`, { width: 320, height: 720 });
    await expect(page.locator("[data-contact-bar=mobile]")).toBeVisible();
    await expect(page.locator("[data-glass-tab-bar]")).toBeHidden();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);

    await page.getByRole("navigation", { name: "Bereiche des Profils" }).getByRole("link", { name: "Medien" }).click();
    await expect(page).toHaveURL(new RegExp(`/de/p/${slug}/medien$`));
    await expect(page.getByRole("link", { name: "Medien" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Hier erscheinen die Fotos, sobald sie geprüft und freigegeben sind.")).toBeVisible();
    // Ohne freigegebene Medien gibt es nichts für die Lightbox: nur die neutrale Fläche, kein Button.
    await expect(page.locator("[data-media-placeholder]")).toBeVisible();
    await expect(page.locator("[data-media-placeholder] button")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", new RegExp(`/de/p/${slug}$`));
    await expectNoHorizontalScroll(page);
  });
});
