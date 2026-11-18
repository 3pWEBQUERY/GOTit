import type { Page } from "@playwright/test";
import { latestMail } from "./outbox";
import { expect } from "./test";

/** Passwort der Konten, die Specs über die echte Registrierung anlegen. */
export const REGISTER_PASSWORD = "ein-langes-test-passwort-1";

export interface RegisterAccount {
  /** Beschriftung des Kontotyps: «Mitglied», «Anbieter», «Club» oder «Agentur». */
  type: string;
  name: string;
  email: string;
  organization?: string;
}

/** Wartet, bis React das Formular übernommen hat; vorher gehen Eingaben bei der Hydrierung verloren. */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const form = document.querySelector("main form");
    return form !== null && Object.keys(form).some((key) => key.startsWith("__react"));
  });
}

/**
 * Füllt die Registrierung aus und sendet sie (PRD 7.4). Ohne `stay` öffnet es
 * zuerst `/de/registrieren`; mit `stay` steht die Seite schon dort, zum
 * Beispiel nach «Konto erstellen» auf der Anmeldung mit `?weiter=`.
 */
export async function registerViaUi(page: Page, account: RegisterAccount, options: { stay?: boolean } = {}): Promise<void> {
  if (!options.stay) await page.goto("/de/registrieren");
  await waitForHydration(page);
  await page.getByRole("radio", { name: account.type }).click();
  await page.getByLabel("Name", { exact: true }).fill(account.name);
  if (account.organization) await page.getByLabel(/^Name (des Clubs|der Agentur)$/).fill(account.organization);
  await page.getByLabel("E-Mail-Adresse").fill(account.email);
  await page.getByLabel("Passwort", { exact: true }).fill(REGISTER_PASSWORD);
  await page.getByRole("checkbox", { name: "Ich bin mindestens 18 Jahre alt." }).click();
  await page.getByRole("checkbox", { name: /Ich akzeptiere die Bedingungen/ }).click();
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL(/\/de\/registrieren\/bestaetigen$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prüfe dein Postfach");
}

/**
 * Öffnet den Bestätigungslink aus dem Ausgang (Tabelle email_outbox), wie ihn
 * die Person aus ihrem Postfach öffnen würde. Better Auth meldet danach an.
 */
export async function confirmEmailFromOutbox(page: Page, email: string): Promise<void> {
  const mail = await latestMail(email);
  expect(mail.subject).toBe("Bestätige deine E-Mail-Adresse");
  await page.goto(mail.link);
  await expect(page).toHaveURL(/\/de\/registrieren\/bestaetigen\?status=bestaetigt/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E-Mail bestätigt");
}
