import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { uniqueEmail } from "./support/outbox";
import { signIn } from "./support/session";
import { expect, test } from "./support/test";

/**
 * Seiten der Einstellungen und die Übersicht `/ich` (Abnahme 15, 17 bis 19, 21, 23).
 * Was speichert, läuft auf einem frischen, fiktiven Konto; nur lesende
 * Prüfungen nutzen das gemeinsame Testkonto «mitglied».
 */
const PASSWORD = "nur-fuer-tests-0000";
const PAGES = [
  "/de/ich",
  "/de/einstellungen/profil",
  "/de/einstellungen/sicherheit",
  "/de/einstellungen/privatsphaere",
  "/de/einstellungen/benachrichtigungen",
  "/de/einstellungen/darstellung",
  "/de/einstellungen/daten",
] as const;

async function query<Row extends object>(sql: string, values: unknown[] = []): Promise<Row[]> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query<Row>(sql, values)).rows;
  } finally {
    await client.end();
  }
}

/** Legt ein fiktives Konto an und meldet die Seite damit an. */
async function signInFresh(page: Page, username: string | null = null): Promise<{ id: string; email: string }> {
  const id = `e2e_${randomUUID()}`;
  const email = uniqueEmail("einstellungen");
  await query(`insert into "user" (id, name, email, "emailVerified", "ageConfirmedAt", "updatedAt", username) values ($1, 'Testkonto Fiktiv', $2, true, now(), now(), $3)`, [id, email, username]);
  await query(`insert into account (id, "accountId", "providerId", "userId", password, "updatedAt") values ($1, $2, 'credential', $2, $3, now())`, [`${id}_credential`, id, await hashPassword(PASSWORD)]);
  const response = await page.request.post("/api/auth/sign-in/email", { data: { email, password: PASSWORD } });
  expect(response.ok(), `Anmeldung ${response.status()}`).toBe(true);
  return { id, email };
}

/** Die Bestätigung am Ort, die gerade sichtbar ist. */
function saved(page: Page) {
  return page.getByText("Gespeichert", { exact: true }).filter({ visible: true }).first();
}

/** Wartet, bis so viele Einstellungen ihr «Gespeichert» zeigen; erst dann darf neu geladen werden. */
async function expectSavedCount(page: Page, count: number): Promise<void> {
  await expect(page.getByText("Gespeichert", { exact: true }).filter({ visible: true })).toHaveCount(count);
}

test.describe("Zugriff (Abnahme 23)", () => {
  for (const path of ["/de/ich", "/de/einstellungen/profil", "/de/einstellungen/sicherheit"]) {
    test(`${path} verlangt die Anmeldung`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(`/de/anmelden?weiter=${encodeURIComponent(path)}`);
    });
  }
});

test.describe("Rahmen und Übersicht (PRD 12.1)", () => {
  test("Desktop: Abschnitte links mit aria-current, Formular rechts", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page, "mitglied");
    await page.goto("/de/einstellungen/privatsphaere");
    const nav = page.getByRole("navigation", { name: "Einstellungen" });
    await expect(nav.getByRole("link")).toHaveCount(6);
    await expect(nav.getByRole("link", { name: "Privatsphäre" })).toHaveAttribute("aria-current", "page");
    await nav.getByRole("link", { name: "Benachrichtigungen" }).click();
    await expect(page).toHaveURL("/de/einstellungen/benachrichtigungen");
    await expect(nav.getByRole("link", { name: "Benachrichtigungen" })).toHaveAttribute("aria-current", "page");
  });

  test("Mobile: zweistufig über /ich, mit Leerzuständen und Anker «Zuletzt angesehen»", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await signIn(page, "mitglied");
    await page.goto("/de/ich");
    await expect(page.getByRole("heading", { level: 1, name: "Übersicht" })).toBeVisible();
    for (const text of ["Keine offenen Anfragen", "Keine ungelesenen Unterhaltungen", "Keine anstehenden Termine", "Noch keine Profile angesehen"]) {
      await expect(page.getByText(text)).toBeVisible();
    }
    await expect(page.locator("#zuletzt-angesehen")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Kurzlinks" }).getByRole("link")).toHaveCount(3);
    await expect(page.getByRole("navigation", { name: "Einstellungen" })).toHaveCount(1);
    await page.getByRole("navigation", { name: "Einstellungen" }).getByRole("link", { name: "Sicherheit" }).click();
    await expect(page).toHaveURL("/de/einstellungen/sicherheit");
    await expect(page.getByRole("link", { name: "Alle Einstellungen" })).toBeVisible();
  });
});

test.describe("Profil (Abnahme 15)", () => {
  test("speichert Name und Benutzername und meldet einen vergebenen Namen am Feld", async ({ page }) => {
    const taken = `vergeben-${Date.now()}`;
    await query(`insert into "user" (id, name, email, "emailVerified", "updatedAt", username) values ($1, 'Fremdes Testkonto', $2, true, now(), $3)`, [`e2e_${randomUUID()}`, uniqueEmail("fremd"), taken]);
    const account = await signInFresh(page);
    await page.goto("/de/einstellungen/profil");
    await expect(page.getByLabel("E-Mail-Adresse")).toHaveValue(account.email);
    await expect(page.getByLabel("E-Mail-Adresse")).toHaveAttribute("readonly", "");

    await page.getByLabel("Benutzername").fill(taken);
    await page.getByRole("button", { name: "Profil speichern" }).click();
    await expect(page.getByLabel("Benutzername")).toBeFocused();
    await expect(page.getByText("Dieser Benutzername ist schon vergeben.").first()).toBeVisible();

    const own = `eigen-${Date.now()}`;
    await page.getByLabel("Name", { exact: true }).fill("Neuer Name Fiktiv");
    await page.getByLabel("Benutzername").fill(own);
    await page.getByRole("button", { name: "Profil speichern" }).click();
    await expect(page.getByText("Profil gespeichert").first()).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Neuer Name Fiktiv");
    await expect(page.getByLabel("Benutzername")).toHaveValue(own);
  });
});

test.describe("Darstellung (Abnahme 19)", () => {
  test("dunkel, reduzierte Bewegung und neutraler Titel wirken sofort und bleiben nach dem Neuladen", async ({ page }) => {
    await signInFresh(page);
    await page.goto("/de/einstellungen/darstellung");
    const html = page.locator("html");

    await page.getByRole("radio", { name: "Dunkel" }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(saved(page)).toBeVisible();

    const motion = page.getByRole("switch", { name: "Bewegung reduzieren" });
    await motion.click();
    await expect(html).toHaveAttribute("data-motion", "reduced");
    await expect(motion).toHaveAttribute("aria-checked", "true");
    await expectSavedCount(page, 2);

    const neutral = page.getByRole("switch", { name: "Neutraler Seitentitel" });
    await neutral.click();
    await expect(page).toHaveTitle("Übersicht");
    await expect(neutral).toHaveAttribute("aria-checked", "true");
    await expectSavedCount(page, 3);

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(html).toHaveAttribute("data-motion", "reduced");
    await expect(page).toHaveTitle("Übersicht");
    await expect(page.getByRole("radio", { name: "Dunkel" })).toBeChecked();

    await page.getByRole("switch", { name: "Neutraler Seitentitel" }).click();
    await expect(page).toHaveTitle(/^Darstellung/);
  });

  test("die Sprache wechselt Pfad und Oberfläche", async ({ page }) => {
    const account = await signInFresh(page);
    await page.goto("/de/einstellungen/darstellung");
    await page.getByRole("combobox", { name: "Sprache" }).click();
    await page.getByRole("option", { name: "Français" }).click();
    await expect(page).toHaveURL("/fr/parametres/affichage");
    await expect(page.getByRole("heading", { level: 1, name: "Affichage" })).toBeVisible();
    const [row] = await query<{ locale: string | null }>(`select locale from user_preference where "userId" = $1`, [account.id]);
    expect(row?.locale).toBe("fr");
  });
});

test.describe("Privatsphäre und Benachrichtigungen (Abnahme 17, 18, 21)", () => {
  test("Voreinstellung ist zurückhaltend; Schalter speichern sofort und bleiben", async ({ page }) => {
    await signInFresh(page);
    await page.goto("/de/einstellungen/privatsphaere");
    const online = page.getByRole("switch", { name: "Online-Status zeigen" });
    await expect(online).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("switch", { name: "Lesebestätigungen senden" })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("heading", { level: 2, name: "Blockiert" })).toBeVisible();
    await expect(page.getByText("Niemand blockiert").filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /speichern/i })).toHaveCount(0);
    await online.click();
    await expect(saved(page)).toBeVisible();
    await page.getByRole("radio", { name: "Niemand" }).click();
    await expectSavedCount(page, 2);
    await page.reload();
    await expect(page.getByRole("switch", { name: "Online-Status zeigen" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: "Niemand" })).toBeChecked();
  });

  test("Benachrichtigung umschalten bleibt; Sicherheit per E-Mail ist gesperrt und erklärt", async ({ page }) => {
    await signInFresh(page);
    await page.goto("/de/einstellungen/benachrichtigungen");
    const message = page.getByRole("switch", { name: "E-Mail bei «Neue Nachricht»" });
    await expect(message).toHaveAttribute("aria-checked", "true");
    await message.click();
    await expect(saved(page)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("switch", { name: "E-Mail bei «Neue Nachricht»" })).toHaveAttribute("aria-checked", "false");

    const security = page.getByRole("switch", { name: "E-Mail bei «Sicherheitshinweise»" });
    await expect(security).toBeDisabled();
    await expect(security).toHaveAttribute("aria-checked", "true");
    await expect(security).toHaveAccessibleDescription("Nur so erfährst du von Anmeldungen auf neuen Geräten.");
    await security.click({ force: true });
    await expect(security).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("Noch nicht verfügbar").first()).toBeVisible();
  });
});

test.describe("Abnahme der Oberfläche", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`axe ohne serious und critical, ${theme === "light" ? "hell" : "dunkel"}`, async ({ page, baseURL }) => {
      test.setTimeout(90_000);
      await signIn(page, "mitglied");
      await page.context().addCookies([{ name: "theme", value: theme, url: baseURL ?? "http://localhost:3000" }]);
      for (const path of PAGES) {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoSeriousAxeFindings(page);
      }
    });
  }

  test("kein horizontales Scrollen bei 320 px", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 320, height: 720 });
    await signIn(page, "mitglied");
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  });
});
