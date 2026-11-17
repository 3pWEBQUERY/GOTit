import { cleanup, createAccount, createReviewCase, enableTwoFactor, reviewState, signInAdmin, signInAs } from "./admin-fixtures";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { signIn } from "./support/session";
import { expect, test } from "./support/test";

/**
 * Zugang zur Admin-Anwendung (PRD 7.8, 13, 16.2): Anmeldung, interne Rolle,
 * zweiter Faktor, Rolle pro Bereich. Die Server Action prüft selbst.
 */
const created: string[] = [];
test.afterEach(async () => {
  await cleanup(created.splice(0));
});

test.describe("Admin-Zugang", () => {
  test("unangemeldet führt zur Anmeldung mit Rückweg", async ({ page }) => {
    await page.goto("/de/admin/verifizierungen");
    await expect(page).toHaveURL(/\/de\/anmelden\?weiter=%2Fde%2Fadmin%2Fverifizierungen$/);
  });

  test("ein Mitglied ohne interne Rolle bekommt eine gewöhnliche 404", async ({ page }) => {
    await signIn(page, "mitglied");
    for (const path of ["/de/admin", "/de/admin/verifizierungen", "/de/admin/verifizierungen/unbekannt"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByRole("heading", { level: 1, name: "Diese Seite gibt es nicht" })).toBeVisible();
      await expect(page.getByText("Admin", { exact: false })).toHaveCount(0);
      expect(await page.title()).not.toContain("Admin");
    }
    await expectNoSeriousAxeFindings(page);
  });

  test("interne Rolle ohne 2FA sieht «Zweiten Faktor einrichten»", async ({ page }) => {
    const admin = await createAccount("SUPER_ADMIN");
    created.push(admin.id);
    await signInAs(page, admin);
    await page.goto("/de/admin/verifizierungen");
    await expect(page.getByRole("heading", { level: 1, name: "Zweiten Faktor einrichten" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sicherheitseinstellungen öffnen" })).toHaveAttribute("href", "/de/einstellungen/sicherheit");
    await expect(page.getByRole("table")).toHaveCount(0);
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 320, height: 720 });
    await expectNoHorizontalScroll(page);
  });

  test("Support sieht die Übersicht, im Bereich Verifizierungen den Hinweis", async ({ page, baseURL }) => {
    const support = await signInAdmin(page, baseURL, "SUPPORT", "Testsupport Frisch Fiktiv");
    created.push(support.id);
    const review = await createReviewCase();
    created.push(review.userId);

    await page.goto("/de/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Übersicht" })).toBeVisible();
    await expect(page.getByText("Angemeldet als Testsupport Frisch Fiktiv")).toBeVisible();
    await expect(page.getByRole("link", { name: "Zum Marktplatz" })).toHaveAttribute("href", "/de");
    await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Bereiche des Admins" });
    await expect(nav.getByRole("link")).toHaveText(["Übersicht", "Verifizierungen", "Medien", "Organisationen", "Meldungen", "Bewertungen"]);
    await expect(nav.getByRole("link", { name: "Übersicht" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Die Prüfwarteschlange ist für Prüfung und Moderation.")).toBeVisible();
    await expect(page.getByText("Schritt 1.13")).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    for (const path of ["/de/admin/verifizierungen", `/de/admin/verifizierungen/${review.reviewId}`]) {
      await page.goto(path);
      await expect(page.getByText("Dieser Bereich ist für Prüfung und Moderation")).toBeVisible();
      await expect(page.getByRole("link", { name: "Zur Übersicht wechseln" })).toHaveAttribute("href", "/de/admin");
      await expect(page.getByRole("table")).toHaveCount(0);
      await expect(page.getByText(review.displayName)).toHaveCount(0);
    }
    await expectNoSeriousAxeFindings(page);
  });

  test("die Server Action verweigert Support den Entscheid", async ({ page, baseURL }) => {
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    const support = await createAccount("SUPPORT");
    const review = await createReviewCase();
    created.push(moderator.id, support.id, review.userId);
    await page.goto(`/de/admin/verifizierungen/${review.reviewId}`);
    await expect(page.getByRole("button", { name: "Entscheid speichern" })).toBeVisible();

    // Dieselbe geladene Seite, jetzt mit der Sitzung von Support: die Aktion muss selbst prüfen.
    await signInAs(page, support, baseURL);
    await enableTwoFactor(page, baseURL);
    await page.getByRole("radio", { name: "Freigeben" }).click();
    await page.getByLabel("Begründung").fill("Fiktive Begründung für den Test");
    await page.getByRole("combobox", { name: "Regel" }).click();
    await page.getByRole("option", { name: "R-1 Angaben vollständig" }).click();
    await page.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(page.getByText("Deine Rolle darf keine Profile prüfen. Es wurde nichts gespeichert.")).toBeVisible();
    expect(await reviewState(review.reviewId)).toMatchObject({ decision: null, status: "SUBMITTED" });
  });

  test("Abmelden führt zum Marktplatz und beendet die Sitzung", async ({ page, baseURL }) => {
    const admin = await signInAdmin(page, baseURL, "SUPER_ADMIN");
    created.push(admin.id);
    await page.goto("/de/admin");
    await page.getByRole("button", { name: "Abmelden" }).click();
    await expect(page).toHaveURL(/\/de(\/alterspruefung.*)?$/, { timeout: 20_000 });
    const session = await (await page.request.get("/api/auth/get-session")).json();
    expect(session).toBeFalsy();
  });
});
