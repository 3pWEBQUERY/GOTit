import type { Page } from "@playwright/test";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { latestMail, uniqueEmail } from "./support/outbox";
import { expect, test } from "./support/test";
import { secretFromOtpauth, totp } from "./support/totp";

const PASSWORD = "ein-langes-test-passwort-1";

/** Wartet, bis React das Formular übernommen hat; vorher gehen Eingaben bei der Hydrierung verloren. */
async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return form !== null && Object.keys(form).some((key) => key.startsWith("__react"));
  });
}

/** Legt ein Mitgliedskonto über die Oberfläche an. Mit `verify` wird der Link geöffnet (danach angemeldet). */
async function registerMember(page: Page, email: string, verify: boolean): Promise<void> {
  await page.goto("/de/registrieren");
  await waitForHydration(page);
  await page.getByRole("radio", { name: "Mitglied" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Beispielname Test");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox", { name: "Ich bin mindestens 18 Jahre alt." }).click();
  await page.getByRole("checkbox", { name: /Ich akzeptiere die Bedingungen/ }).click();
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/de\/registrieren\/bestaetigen$/);
  if (!verify) return;
  await page.goto((await latestMail(email)).link);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E-Mail bestätigt");
}

async function signInViaUi(page: Page, email: string, password: string, path = "/de/anmelden"): Promise<void> {
  await page.goto(path);
  await waitForHydration(page);
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Mit E-Mail anmelden" }).click();
}

test.describe("Anmeldung (PRD 7.4, Abnahme 8–12)", () => {
  test("zeigt Passkey, «Passwort vergessen» und «Konto erstellen»", async ({ page }) => {
    await page.goto("/de/anmelden");
    await expect(page.getByRole("button", { name: "Mit Passkey anmelden" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Passwort vergessen" })).toHaveAttribute("href", "/de/passwort/vergessen");
    await expect(page.getByRole("link", { name: "Konto erstellen" })).toHaveAttribute("href", "/de/registrieren");
    await expect(page.getByRole("link", { name: "Hilfe zu Konto und Anmeldung" })).toHaveAttribute("href", "/de/hilfe");
    await expectNoSeriousAxeFindings(page);
  });

  test("unbestätigte Adresse: Hinweis und «Bestätigungs-E-Mail erneut senden»", async ({ page }) => {
    const email = uniqueEmail("unbestaetigt");
    await registerMember(page, email, false);
    await signInViaUi(page, email, PASSWORD);
    await expect(page.getByText("Bestätige zuerst deine E-Mail-Adresse")).toBeVisible();
    await page.getByRole("button", { name: "Bestätigungs-E-Mail erneut senden" }).click();
    await expect(page.getByText("E-Mail ist unterwegs")).toBeVisible();
    await expect(page).toHaveURL(/\/de\/anmelden$/);
    await expectNoSeriousAxeFindings(page);
  });

  test("falsches Passwort und unbekannte Adresse ergeben dieselbe Meldung", async ({ page }) => {
    await signInViaUi(page, "mitglied@fiktiv.test", "falsches-passwort-123");
    const alert = page.getByRole("alert").filter({ hasText: "E-Mail-Adresse oder Passwort stimmen nicht" });
    await expect(alert).toBeVisible();
    const known = await alert.innerText();
    expect(known).not.toMatch(/existiert|unbekannt|kein Konto/i);
    await expectNoSeriousAxeFindings(page);

    await signInViaUi(page, uniqueEmail("gibt-es-nicht"), "falsches-passwort-123");
    await expect(alert).toBeVisible();
    expect(await alert.innerText()).toBe(known);
  });

  test("nach 5 Fehlversuchen in einer Minute nennt der sechste die Wartezeit und behält die Eingaben", async ({ page }) => {
    await page.goto("/de/anmelden");
    await waitForHydration(page);
    const email = page.getByLabel("E-Mail-Adresse");
    await email.fill("mitglied@fiktiv.test");
    await page.getByLabel("Passwort", { exact: true }).fill("falsches-passwort-123");
    const submit = page.getByRole("button", { name: "Mit E-Mail anmelden" });
    const invalid = page.getByText("E-Mail-Adresse oder Passwort stimmen nicht");
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await submit.click();
      await expect(invalid).toBeVisible();
      await expect(submit).not.toHaveAttribute("aria-busy", "true");
    }
    await submit.click();
    await expect(page.getByText("Zu viele Versuche")).toBeVisible();
    await expect(page.getByText(/Warte \d+ Sekunden? und versuche es dann erneut/)).toBeVisible();
    await expect(email).toHaveValue("mitglied@fiktiv.test");
  });

  test("mit 2FA: weiter zu /anmelden/2fa mit ?weiter, falscher Code am Feld, richtiger Code führt zum Ziel", async ({ page }) => {
    const email = uniqueEmail("zweifaktor");
    await registerMember(page, email, true);

    const enable = await page.request.post("/api/auth/two-factor/enable", { data: { password: PASSWORD } });
    expect(enable.ok()).toBe(true);
    const { totpURI } = (await enable.json()) as { totpURI: string };
    const secret = secretFromOtpauth(totpURI);
    const verify = await page.request.post("/api/auth/two-factor/verify-totp", { data: { code: totp(secret) } });
    expect(verify.ok()).toBe(true);
    await page.context().clearCookies();

    await signInViaUi(page, email, PASSWORD, `/de/anmelden?weiter=${encodeURIComponent("/de/fuer-anbieter")}`);
    await expect(page).toHaveURL(/\/de\/anmelden\/2fa\?weiter=%2Fde%2Ffuer-anbieter$/);
    await waitForHydration(page);
    const code = page.getByLabel("Code aus der App");
    await expect(code).toHaveAttribute("inputmode", "numeric");
    await expect(code).toHaveAttribute("autocomplete", "one-time-code");
    await expect(page.getByRole("checkbox", { name: "Diesem Gerät 30 Tage vertrauen" })).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    const valid = [-30_000, 0, 30_000].map((offset) => totp(secret, Date.now() + offset));
    const wrong = ["000000", "111111", "222222", "333333"].find((candidate) => !valid.includes(candidate)) ?? "999999";
    await code.fill(wrong);
    await page.getByRole("button", { name: "Code bestätigen" }).click();
    await expect(page.getByText("Dieser Code stimmt nicht.", { exact: false }).first()).toBeVisible();
    await expect(code).toBeFocused();

    await page.getByRole("button", { name: "Ersatzcode verwenden" }).click();
    await expect(page.getByLabel("Ersatzcode")).toBeVisible();
    await page.getByRole("button", { name: "Code aus der App verwenden" }).click();

    await page.getByLabel("Code aus der App").fill(totp(secret));
    await page.getByRole("button", { name: "Code bestätigen" }).click();
    await expect(page).toHaveURL(/\/de\/fuer-anbieter$/);
  });

  test("ohne laufende Anmeldung sagt /anmelden/2fa, dass sie abgelaufen ist", async ({ page }) => {
    await page.goto("/de/anmelden/2fa");
    await waitForHydration(page);
    await page.getByLabel("Code aus der App").fill("123456");
    await page.getByRole("button", { name: "Code bestätigen" }).click();
    await expect(page.getByText("Deine Anmeldung ist abgelaufen")).toBeVisible();
    await expect(page.getByRole("link", { name: "Erneut anmelden" })).toHaveAttribute("href", "/de/anmelden");
  });
});

test.describe("Passwort zurücksetzen (Abnahme 13, 14)", () => {
  test("E-Mail, neues Passwort; das alte gilt nicht mehr, das neue schon", async ({ page }) => {
    const email = uniqueEmail("passwort");
    const newPassword = "ein-ganz-neues-passwort-2";
    await registerMember(page, email, true);
    await page.context().clearCookies();

    await page.goto("/de/passwort/vergessen");
    await waitForHydration(page);
    await page.getByLabel("E-Mail-Adresse").fill(email);
    await page.getByRole("button", { name: "Link anfordern" }).click();
    const sent = page.getByText("Wenn ein Konto zu dieser Adresse existiert");
    await expect(sent).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    const mail = await latestMail(email);
    expect(mail.subject).toBe("Neues Passwort festlegen");
    await page.goto(mail.link);
    await expect(page).toHaveURL(/\/de\/passwort\/neu\?token=/);
    await expect(page.getByText("Alle Geräte werden abgemeldet")).toBeVisible();
    await waitForHydration(page);
    await page.getByLabel("Neues Passwort", { exact: true }).fill(newPassword);
    await page.getByLabel("Neues Passwort wiederholen").fill("etwas-anderes-passwort-3");
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page.getByText("Die beiden Passwörter stimmen nicht überein.").first()).toBeVisible();
    await expect(page.getByLabel("Neues Passwort wiederholen")).toBeFocused();
    await page.getByLabel("Neues Passwort wiederholen").fill(newPassword);
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page.getByText("Passwort geändert")).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    await signInViaUi(page, email, PASSWORD);
    await expect(page.getByText("E-Mail-Adresse oder Passwort stimmen nicht")).toBeVisible();
    await signInViaUi(page, email, newPassword);
    await expect(page).toHaveURL(/\/de$/);
  });

  test("unbekannte Adresse erhält dieselbe Antwort", async ({ page }) => {
    await page.goto("/de/passwort/vergessen");
    await waitForHydration(page);
    await page.getByLabel("E-Mail-Adresse").fill(uniqueEmail("niemand"));
    await page.getByRole("button", { name: "Link anfordern" }).click();
    await expect(page.getByText("Wenn ein Konto zu dieser Adresse existiert")).toBeVisible();
  });

  test("ungültiger Link führt zu «Neuen Link anfordern»", async ({ page }) => {
    await page.goto("/de/passwort/neu?error=INVALID_TOKEN");
    await expect(page.getByText("Dieser Link gilt nicht mehr")).toBeVisible();
    await expect(page.getByRole("link", { name: "Neuen Link anfordern" })).toHaveAttribute("href", "/de/passwort/vergessen");

    await page.goto("/de/passwort/neu?token=ungueltiger-token-123");
    await waitForHydration(page);
    await page.getByLabel("Neues Passwort", { exact: true }).fill("ein-ganz-neues-passwort-2");
    await page.getByLabel("Neues Passwort wiederholen").fill("ein-ganz-neues-passwort-2");
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page.getByText("Dieser Link gilt nicht mehr")).toBeVisible();
  });
});
