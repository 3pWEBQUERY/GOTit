import { randomUUID } from "node:crypto";
import type { Browser, Page } from "@playwright/test";
import { cleanup, createAccount, query, signInAdmin, signInAs, type FreshAccount } from "./admin-fixtures";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { confirmAge } from "./support/session";
import { expect, test } from "./support/test";

/**
 * Bearbeiten am Ort, Studio «Mein Profil» und Prüfung von Änderungen
 * (PRD v2 6.1, 11.2, v1 FR-PROFILE-006, Entscheid 0012). Frische, fiktive
 * Konten per SQL; ein freigegebenes Profil hat gültige Identität und Erstprüfung.
 */
interface Owner {
  account: FreshAccount;
  profileId: string;
  slug: string;
  name: string;
}

const created: string[] = [];
test.afterAll(async () => cleanup(created));

async function publishedOwner(status = "PUBLISHED"): Promise<Owner> {
  const suffix = randomUUID().slice(0, 8);
  const name = `Editorname ${suffix} Fiktiv`;
  const account = await createAccount(undefined, `Editorkonto ${suffix} Fiktiv`);
  created.push(account.id);
  const profileId = `e2e_editor_${suffix}`;
  const slug = `fiktiv-editor-${suffix}`;
  await query(
    `insert into provider_profile (id, "userId", slug, "displayName", status, description, languages, "updatedAt")
     values ($1, $2, $3, $4, $5, 'Fiktive Beschreibung vor der Änderung, lang genug für die Regel der Plattform.', '{de}', now())`,
    [profileId, account.id, slug, name, status],
  );
  const [region] = await query<{ id: string }>(`select id from region where slug = 'stadt-zuerich'`);
  await query(`insert into provider_region ("providerProfileId", "regionId") values ($1, $2)`, [profileId, region?.id]);
  await query(`insert into rate_item (id, "providerProfileId", "durationMinutes", "priceChf", "sortOrder", "updatedAt") values ($1, $2, 60, 300, 0, now())`, [`e2e_rate_${suffix}`, profileId]);
  await query(
    `insert into identity_check (id, "userId", provider, "externalRef", status, "ageOver18", "livenessPassed", "checkedAt", "expiresAt", "updatedAt")
     values ($1, $2, 'test', $3, 'APPROVED', true, true, now(), now() + interval '300 days', now())`,
    [`e2e_identity_${suffix}`, account.id, `e2e-ref-${randomUUID()}`],
  );
  await query(`insert into profile_review (id, "providerProfileId", decision, "decidedAt") values ($1, $2, 'APPROVED', now())`, [`e2e_review_${suffix}`, profileId]);
  return { account, profileId, slug, name };
}

async function asVisitor(browser: Browser, path: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await confirmAge(page, path);
  return page;
}

test.describe("Eigentümer-Leiste und Seitenpanel (PRD v2 6.1)", () => {
  test("Beschreibung im Seitenpanel bearbeiten; die Änderung ist sofort öffentlich", async ({ page, browser }) => {
    const owner = await publishedOwner();
    await signInAs(page, owner.account);
    await page.goto(`/de/p/${owner.slug}`);
    const bar = page.locator("[data-owner-bar]");
    await expect(bar).toContainText("So sehen Besucher dein Profil");
    await expect(bar).toContainText("Besucher sehen diese Seite.");
    await expect(bar.getByRole("link", { name: /Statistik/ })).toHaveCount(0);

    await bar.getByRole("button", { name: "Bearbeiten" }).click();
    await page.getByRole("menuitem", { name: "Beschreibung" }).click();
    await expect(page).toHaveURL(new RegExp(`/de/p/${owner.slug}\\?bearbeiten=beschreibung$`));
    const panel = page.getByRole("dialog", { name: "Beschreibung" });
    const text = `Neue fiktive Beschreibung ${randomUUID().slice(0, 6)}, direkt im Seitenpanel geändert und lang genug.`;
    await panel.getByLabel("Beschreibung").fill(text);
    await page.keyboard.press("Escape");
    await expect(panel.getByText("Deine Änderungen sind noch nicht gespeichert.")).toBeVisible();
    await panel.getByRole("button", { name: "Weiter bearbeiten" }).click();
    await expectNoSeriousAxeFindings(page);
    await panel.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(panel).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/de/p/${owner.slug}$`));
    await expect(page.getByText(text)).toBeVisible();

    const visitor = await asVisitor(browser, `/de/p/${owner.slug}`);
    await expect(visitor.getByText(text)).toBeVisible();
    await expect(visitor.locator("[data-owner-bar]")).toHaveCount(0);
  });

  test("der Inhaber sieht sein nicht öffentliches Profil mit Hinweis auf den Status", async ({ page }) => {
    const owner = await publishedOwner("SUBMITTED");
    await signInAs(page, owner.account);
    await page.goto(`/de/p/${owner.slug}`);
    await expect(page.locator("[data-owner-bar]")).toContainText("Profil: In Prüfung. Besucher sehen diese Seite zurzeit nicht.");
    await expect(page.getByRole("heading", { level: 1, name: owner.name })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("Studio «Mein Profil» (PRD v2 11.2)", () => {
  test("Anzeigename: Hinweis zur Prüfung, öffentlich bleibt der alte Name, nach der Freigabe der neue", async ({ page, browser, baseURL }) => {
    const owner = await publishedOwner();
    await signInAs(page, owner.account);
    await page.goto("/de/studio/profil/basis");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1, name: "Mein Profil" })).toBeVisible();
    const newName = `Neuer Name ${randomUUID().slice(0, 6)} Fiktiv`;
    await page.getByLabel("Anzeigename").fill(newName);
    await expect(page.getByText("Diese Änderung wird geprüft, bevor sie sichtbar ist. Dein bisheriges Profil bleibt solange online.")).toBeVisible();
    await page.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(page.locator("[data-section-form]").getByText("Änderung in Prüfung")).toBeVisible();

    const visitor = await asVisitor(browser, `/de/p/${owner.slug}`);
    await expect(visitor.getByRole("heading", { level: 1, name: owner.name })).toBeVisible();

    const admin = await (await browser.newContext()).newPage();
    const reviewer = await signInAdmin(admin, baseURL, "MODERATOR");
    created.push(reviewer.id);
    const [review] = await query<{ id: string }>(`select id from profile_review where "providerProfileId" = $1 and kind = 'CHANGE' and decision is null`, [owner.profileId]);
    await admin.goto("/de/admin/verifizierungen");
    await expect(admin.locator(`[data-case-link="${review?.id}"]`).locator("xpath=ancestor::tr")).toContainText("Änderung");
    await admin.goto(`/de/admin/verifizierungen/${review?.id}`);
    await expect(admin.getByRole("heading", { level: 1, name: `Änderung von ${owner.name}` })).toBeVisible();
    const comparison = admin.locator("[data-change-comparison]");
    // Gestreamte Inhalte stehen kurz doppelt im DOM (verborgen); geprüft wird der sichtbare Stand.
    await expect(comparison.locator("[data-before]").filter({ visible: true })).toHaveText(owner.name);
    await expect(comparison.locator("[data-after]").filter({ visible: true })).toHaveText(newName);
    await expect(admin.getByRole("radio", { name: "Zur Korrektur" })).toHaveCount(0);
    await admin.getByRole("radio", { name: "Freigeben" }).click();
    await admin.getByLabel("Begründung").fill("Der neue Name ist unauffällig und zulässig.");
    await admin.getByRole("combobox", { name: "Regel" }).click();
    await admin.getByRole("option", { name: "R-1 Angaben vollständig" }).click();
    await admin.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(admin).not.toHaveURL(new RegExp(`${review?.id}$`));

    await visitor.reload();
    await expect(visitor.getByRole("heading", { level: 1, name: newName })).toBeVisible();
  });

  test("Preis ausblenden: nicht mehr öffentlich", async ({ page, browser }) => {
    const owner = await publishedOwner();
    await signInAs(page, owner.account);
    await page.goto("/de/studio/profil/preise");
    await page.waitForLoadState("networkidle");
    await page.getByRole("checkbox", { name: "Im Profil ausblenden" }).click();
    await page.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(page.getByText("Änderungen gespeichert").first()).toBeVisible();
    const visitor = await asVisitor(browser, `/de/p/${owner.slug}`);
    await expect(visitor.getByText("Preise auf Anfrage")).toBeVisible();
    await expect(visitor.getByRole("table")).toHaveCount(0);
  });

  test("Vorschau zeigt ungespeicherte Werte; Verlassen fragt nach, die Eingaben bleiben im Tab", async ({ page }) => {
    const owner = await publishedOwner();
    await signInAs(page, owner.account);
    await page.goto("/de/studio/profil/beschreibung");
    // Erst nach dem Hydrieren tippen; sonst setzt React den Wert mitten im Ausfüllen zurück.
    await page.waitForLoadState("networkidle");
    const draft = `Ungespeicherte fiktive Beschreibung ${randomUUID().slice(0, 6)}, nur in der Vorschau sichtbar.`;
    await page.getByRole("textbox", { name: "Beschreibung" }).fill(draft);
    await expect(page.getByRole("textbox", { name: "Beschreibung" })).toHaveValue(draft);
    await expect(page.locator("[data-preview-frame]")).toContainText(draft);
    await page.getByRole("button", { name: "Desktop" }).click();
    await expect(page.locator("[data-preview-frame=desktop]")).toContainText(draft);

    await page.getByRole("navigation", { name: "Abschnitte" }).getByRole("link", { name: /Preise/ }).click();
    const dialog = page.getByRole("alertdialog", { name: "Seite mit ungespeicherten Änderungen verlassen?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Weiter bearbeiten" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/profil\/beschreibung$/);

    page.on("dialog", (prompt) => void prompt.accept());
    await page.reload();
    await expect(page.getByText("Ungespeicherte Änderungen aus diesem Tab wiederhergestellt.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Beschreibung" })).toHaveValue(draft);
    await page.getByRole("navigation", { name: "Abschnitte" }).getByRole("link", { name: /Preise/ }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Seite verlassen" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/profil\/preise$/);
    const [profile] = await query<{ description: string }>(`select description from provider_profile where id = $1`, [owner.profileId]);
    expect(profile?.description).not.toBe(draft);
  });

  test("Abschnittsliste mit Stand, axe, 320 px ohne horizontales Scrollen; Entwurf führt ins Onboarding", async ({ page, browser }) => {
    const owner = await publishedOwner();
    await signInAs(page, owner.account);
    await page.goto("/de/studio/profil");
    const list = page.getByRole("navigation", { name: "Abschnitte" });
    await expect(list.getByRole("link", { name: /Basis.*vollständig/ })).toBeVisible();
    await expect(list.getByRole("link", { name: /Angebot.*folgt/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Im Marktplatz ansehen" })).toHaveAttribute("href", `/de/p/${owner.slug}`);
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 320, height: 720 });
    await expectNoHorizontalScroll(page);
    await page.goto("/de/studio/profil/regionen");
    await expectNoHorizontalScroll(page);
    await page.getByRole("button", { name: "Vorschau ansehen" }).click();
    await expect(page.getByRole("dialog", { name: "Vorschau" })).toContainText(owner.name);

    const draft = await publishedOwner("DRAFT");
    const draftPage = await (await browser.newContext()).newPage();
    await signInAs(draftPage, draft.account);
    await draftPage.goto("/de/studio/profil");
    await expect(draftPage).toHaveURL(/\/de\/studio\/start/);
  });
});
