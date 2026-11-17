import { query, signInAdmin } from "./admin-fixtures";
import {
  cleanupOrganizations,
  createOrganization,
  openAs,
  member,
} from "./organization-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Nachweise (v1 FR-VERIFY-003): Die Organisation reicht Firmenname, UID und
 * Berechtigung ein, die Moderation entscheidet in `/admin/organisationen`;
 * erst die Freigabe veröffentlicht die Organisation.
 */
const organizations: string[] = [];
const users: string[] = [];
test.afterEach(async () => cleanupOrganizations(organizations, users));

test.describe("Nachweise und Prüfung der Organisation", () => {
  test("einreichen, Moderation gibt frei, die Organisation ist veröffentlicht", async ({
    page,
    browser,
    baseURL,
  }) => {
    const org = await createOrganization(["OWNER"], { created: users });
    organizations.push(org.id);
    await openAs(
      page,
      member(org, "OWNER"),
      `/de/studio/o/${org.slug}/nachweise`,
    );
    await expect(page.locator("[data-verification-state]")).toHaveAttribute(
      "data-verification-state",
      "NONE",
    );
    await expect(
      page.getByText("Wir speichern keine Ausweise und keine Dokumente", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("öffentlichen Handelsregister", { exact: false }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Nachweise einreichen" }).click();
    await expect(
      page
        .getByText("Bestätige, dass du für die Organisation handeln darfst.")
        .first(),
    ).toBeVisible();
    await page
      .getByLabel("Firmenname laut Handelsregister")
      .fill("Fiktiv Nachtwerk GmbH");
    await page.getByLabel("UID", { exact: true }).fill("CHE-123.456");
    await page.getByLabel("UID", { exact: true }).blur();
    await expect(
      page.getByText("Gib die UID im Format CHE-123.456.789 ein.").first(),
    ).toBeVisible();
    await page.getByLabel("UID", { exact: true }).fill("che-123.456.789");
    await page.getByLabel("UID", { exact: true }).blur();
    await page
      .getByRole("checkbox", {
        name: "Ich bin berechtigt, für diese Organisation zu handeln.",
      })
      .click();
    await page
      .getByLabel(/Bewilligungen/)
      .fill("Gastgewerbebewilligung der Stadt, fiktiv.");
    await expectNoSeriousAxeFindings(page);
    await page.getByRole("button", { name: "Nachweise einreichen" }).click();
    await expect(page.locator("[data-verification-state]")).toHaveAttribute(
      "data-verification-state",
      "SUBMITTED",
    );
    await expect(page.locator("[data-verification-form]")).toHaveCount(0);
    const [submitted] = await query<{
      id: string;
      uid: string;
      authorityConfirmed: boolean;
    }>(
      `select id, uid, "authorityConfirmed" from organization_verification where "organizationId" = $1`,
      [org.id],
    );
    expect(submitted).toMatchObject({
      uid: "CHE-123.456.789",
      authorityConfirmed: true,
    });
    expect(
      (
        await query<{ status: string }>(
          `select status from organization where id = $1`,
          [org.id],
        )
      )[0]?.status,
    ).toBe("SUBMITTED");

    const adminContext = await browser.newContext({ baseURL });
    const admin = await adminContext.newPage();
    const moderator = await signInAdmin(admin, baseURL, "MODERATOR");
    users.push(moderator.id);
    await admin.goto("/de/admin/organisationen");
    const nav = admin.getByRole("navigation", { name: "Bereiche des Admins" });
    await expect(
      nav.getByRole("link", { name: /Organisationen/ }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      nav.locator('a[href="/de/admin/organisationen"] .sr-only'),
    ).toHaveText(/Organisation(en)? warte/);
    await admin
      .locator(`[data-organization-case-link="${submitted?.id}"]`)
      .locator("visible=true")
      .click();
    await expect(
      admin.getByRole("heading", { level: 1, name: `Prüfung von ${org.name}` }),
    ).toBeVisible();
    await expect(
      admin.getByText("Gastgewerbebewilligung der Stadt, fiktiv."),
    ).toBeVisible();
    await admin.waitForLoadState("networkidle");
    await admin.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(admin.getByText("Wähle ein Ergebnis.").first()).toBeVisible();
    await admin.getByRole("radio", { name: /Freigeben/ }).click();
    await admin.getByLabel("Begründung").fill("kurz");
    await admin.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(
      admin.getByText("Die Begründung braucht mindestens 10 Zeichen.").first(),
    ).toBeVisible();
    await admin
      .getByLabel("Begründung")
      .fill("Firmenname und UID stimmen mit dem Register überein.");
    await expectNoSeriousAxeFindings(admin);
    await admin.getByRole("button", { name: "Entscheid speichern" }).click();
    // Danach öffnet sich der nächste offene Fall oder die Warteschlange.
    await expect(
      admin.getByText("Entscheid gespeichert", { exact: true }),
    ).toBeVisible();
    await adminContext.close();

    const [organization] = await query<{
      status: string;
      publishedAt: Date | null;
    }>(`select status, "publishedAt" from organization where id = $1`, [
      org.id,
    ]);
    expect(organization?.status).toBe("PUBLISHED");
    expect(organization?.publishedAt).not.toBeNull();
    expect(
      await query(
        `select reason from audit_event where target = $1 and action = 'organization_verification.approved'`,
        [`organization_verification:${submitted?.id}`],
      ),
    ).toHaveLength(1);

    await page.goto(`/de/studio/o/${org.slug}/profil`);
    await expect(page.locator("[data-organization-status]")).toHaveText(
      "Veröffentlicht",
    );
    await expect(page.locator("[data-verification-status]")).toHaveText(
      "Freigegeben",
    );
    await page.goto(`/de/studio/o/${org.slug}/nachweise`);
    await expect(
      page.getByRole("heading", { name: "Angaben neu einreichen" }),
    ).toBeVisible();
  });

  test("Korrektur verlangt: Begründung in Nachweise und Heute; Support hat keinen Zugang", async ({
    page,
    browser,
    baseURL,
  }) => {
    const org = await createOrganization(["OWNER"], { created: users });
    organizations.push(org.id);
    const [verification] = await query<{ id: string }>(
      `insert into organization_verification (id, "organizationId", "legalName", uid, "authorityConfirmed") values ('e2e_ov_' || md5(random()::text), $1, 'Fiktiv Bar AG', 'CHE-987.654.321', true) returning id`,
      [org.id],
    );
    await query(`update organization set status = 'SUBMITTED' where id = $1`, [
      org.id,
    ]);

    const supportContext = await browser.newContext({ baseURL });
    const support = await supportContext.newPage();
    users.push((await signInAdmin(support, baseURL, "SUPPORT")).id);
    await support.goto(`/de/admin/organisationen/${verification?.id}`);
    await expect(
      support.getByText(
        "Dieser Bereich ist für Moderation, Trust & Safety und Plattform-Administration.",
      ),
    ).toBeVisible();
    await expect(support.getByText("Fiktiv Bar AG")).toHaveCount(0);
    await supportContext.close();

    const adminContext = await browser.newContext({ baseURL });
    const admin = await adminContext.newPage();
    users.push((await signInAdmin(admin, baseURL, "TRUST_SAFETY")).id);
    expect(
      (await admin.goto("/de/admin/organisationen/unbekannt"))?.status(),
    ).toBe(404);
    await admin.goto(`/de/admin/organisationen/${verification?.id}`);
    await admin.waitForLoadState("networkidle");
    await admin.getByRole("radio", { name: /Zur Korrektur/ }).click();
    await admin
      .getByLabel("Begründung")
      .fill("Der Firmenname weicht vom Handelsregister ab.");
    await admin.getByRole("button", { name: "Entscheid speichern" }).click();
    // Danach öffnet sich der nächste offene Fall oder die Warteschlange.
    await expect(
      admin.getByText("Entscheid gespeichert", { exact: true }),
    ).toBeVisible();
    await adminContext.close();

    await openAs(page, member(org, "OWNER"), `/de/studio/o/${org.slug}`);
    await expect(page.locator("[data-todo=nachweise]")).toContainText(
      "Korrektur verlangt",
    );
    await expect(page.locator("[data-todo=nachweise]")).toContainText(
      "Der Firmenname weicht vom Handelsregister ab.",
    );
    await page.goto(`/de/studio/o/${org.slug}/nachweise`);
    await expect(page.locator("[data-verification-reason]")).toContainText(
      "Der Firmenname weicht vom Handelsregister ab.",
    );
    await expect(
      page.getByLabel("Firmenname laut Handelsregister"),
    ).toHaveValue("Fiktiv Bar AG");
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);
  });
});
