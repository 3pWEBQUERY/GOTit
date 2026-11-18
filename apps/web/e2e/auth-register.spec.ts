import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { latestMail, mailCount, uniqueEmail } from "./support/outbox";
import { REGISTER_PASSWORD as PASSWORD, registerViaUi, waitForHydration } from "./support/register";
import { expect, test } from "./support/test";

test.describe("Registrierung (PRD 7.4, Abnahme 1–7)", () => {
  test("als Mitglied: neutrale E-Mail auf Deutsch, Bestätigung, danach Anmeldung zurück zu ?weiter", async ({ page }) => {
    const email = uniqueEmail("mitglied-neu");
    const name = "Beispielname Mitglied";
    await registerViaUi(page, { type: "Mitglied", name, email });
    await expect(page.getByText(email)).toBeVisible();
    expect(page.url()).not.toContain(encodeURIComponent(email));
    expect(page.url()).not.toContain("fiktiv.test");
    await expectNoSeriousAxeFindings(page);

    const mail = await latestMail(email);
    expect(mail.subject).toBe("Bestätige deine E-Mail-Adresse");
    expect(mail.subject).not.toContain(name);
    expect(mail.text).toContain("Bitte bestätige deine E-Mail-Adresse");

    await page.goto(mail.link);
    await expect(page).toHaveURL(/\/de\/registrieren\/bestaetigen\?status=bestaetigt$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("E-Mail bestätigt");
    await expect(page.getByRole("link", { name: "Mitgliederbereich öffnen" })).toHaveAttribute("href", "/de/ich");
    await expectNoSeriousAxeFindings(page);

    await page.context().clearCookies();
    await page.goto(`/de/anmelden?weiter=${encodeURIComponent("/de/fuer-anbieter")}`);
    await waitForHydration(page);
    await page.getByLabel("E-Mail-Adresse").fill(email);
    await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Mit E-Mail anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/fuer-anbieter$/);
  });

  test("als Anbieter: nach der Bestätigung führt /studio ins Onboarding", async ({ page }) => {
    const email = uniqueEmail("anbieter-neu");
    await registerViaUi(page, { type: "Anbieter", name: "Beispielname Anbieter", email });
    const mail = await latestMail(email);
    await page.goto(mail.link);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("E-Mail bestätigt");
    await expect(page.getByRole("link", { name: "Profil einrichten" })).toHaveAttribute("href", "/de/studio/start");
    await page.goto("/de/studio");
    // /studio/start leitet weiter auf den ersten offenen Schritt des Onboardings.
    await expect(page).toHaveURL(/\/de\/studio\/start(\/[a-z-]+)?$/);
  });

  test("eine vergebene Adresse sieht aus wie eine neue und erhält keine zweite E-Mail", async ({ page }) => {
    const email = uniqueEmail("doppelt");
    await registerViaUi(page, { type: "Mitglied", name: "Beispielname Eins", email });
    const firstView = await page.getByRole("main").innerText();
    await latestMail(email);
    expect(await mailCount(email)).toBe(1);

    await registerViaUi(page, { type: "Club", name: "Beispielname Zwei", email, organization: "Beispielclub Fiktiv" });
    expect(await page.getByRole("main").innerText()).toBe(firstView);
    // Der Worker verschickt in Sekunden; eine zweite E-Mail wäre bis dahin im Ausgang.
    await page.waitForTimeout(4000);
    expect(await mailCount(email)).toBe(1);
  });

  test("fehlende Pflichtfelder: Zusammenfassung oben, Fokus auf dem ersten Fehler, Sprunglinks", async ({ page }) => {
    await page.goto("/de/registrieren");
    await waitForHydration(page);
    const submit = page.getByRole("button", { name: "Konto erstellen" });
    await expect(submit).toBeEnabled();
    await submit.click();

    const summary = page.getByRole("alert").filter({ hasText: /Angaben fehlen oder stimmen nicht/ });
    await expect(summary).toContainText("6 Angaben fehlen oder stimmen nicht");
    await expect(page.getByRole("radio", { name: "Mitglied" })).toBeFocused();
    await expect(page.getByText("Wähle einen Kontotyp.").first()).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    await summary.getByRole("link", { name: /gültige E-Mail-Adresse/ }).click();
    await expect(page.getByLabel("E-Mail-Adresse")).toBeFocused();

    await page.getByRole("radio", { name: "Agentur" }).click();
    await expect(page.getByLabel("Name der Agentur")).toBeVisible();
    await expect(summary).toContainText("5 Angaben fehlen");
  });

  test("Prüfung beim Verlassen des Felds, nicht beim Tippen", async ({ page }) => {
    await page.goto("/de/registrieren");
    await waitForHydration(page);
    const password = page.getByLabel("Passwort", { exact: true });
    await password.fill("kurz");
    await expect(page.getByText("Das Passwort braucht mindestens 12 Zeichen.")).toHaveCount(0);
    await password.blur();
    await expect(page.getByText("Das Passwort braucht mindestens 12 Zeichen.")).toBeVisible();
    await expect(password).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("Bestätigungsseite (PRD 7.4)", () => {
  test("ohne bekannte Adresse fragt sie nach der Adresse; ein ungültiger Link sagt das", async ({ page }) => {
    await page.goto("/de/registrieren/bestaetigen");
    await expect(page.getByText("Wir haben dir einen Bestätigungslink geschickt.")).toBeVisible();
    await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    await page.goto("/de/registrieren/bestaetigen?status=bestaetigt&error=TOKEN_EXPIRED");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dieser Bestätigungslink gilt nicht mehr");
    await waitForHydration(page);
    await page.getByLabel("E-Mail-Adresse").fill(uniqueEmail("unbekannt"));
    await page.getByRole("button", { name: "Bestätigungs-E-Mail erneut senden" }).click();
    await expect(page.getByText("E-Mail ist unterwegs")).toBeVisible();
    await expectNoSeriousAxeFindings(page);
  });
});

test.describe("Konto-Seiten bei 320 px (PRD 13, Zoom und Breite)", () => {
  test.use({ viewport: { width: 320, height: 800 } });

  const paths = [
    "/de/registrieren",
    "/de/registrieren/bestaetigen",
    "/de/registrieren/bestaetigen?status=bestaetigt",
    "/de/registrieren/bestaetigen?error=INVALID_TOKEN",
    "/de/anmelden",
    "/de/anmelden/2fa",
    "/de/passwort/vergessen",
    "/de/passwort/neu",
    "/de/passwort/neu?token=beispieltoken123",
    "/fr/inscription",
  ];

  test("kein horizontales Scrollen und keine schweren axe-Befunde", async ({ page }) => {
    for (const path of paths) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expectNoHorizontalScroll(page);
      await expectNoSeriousAxeFindings(page);
    }
  });
});
