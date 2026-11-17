import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { request as playwrightRequest, type APIRequestContext, type Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";
import { uniqueEmail } from "./support/outbox";
import { expect, test, testClientIp } from "./support/test";
import { totp } from "./support/totp";

/**
 * Einstellungen, die das Konto verändern (Abnahme 16, 20, 22, 24). Jeder Test
 * legt ein frisches, erkennbar fiktives Konto direkt in der Datenbank an und
 * meldet sich über die Auth-API an; die gemeinsamen Testkonten bleiben unberührt.
 */
const PASSWORD = "nur-fuer-tests-0000";

interface FreshAccount {
  id: string;
  email: string;
}

async function query<Row extends object>(sql: string, values: unknown[] = []): Promise<Row[]> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query<Row>(sql, values)).rows;
  } finally {
    await client.end();
  }
}

async function createAccount(): Promise<FreshAccount> {
  const id = `e2e_${randomUUID()}`;
  const email = uniqueEmail("einstellungen");
  await query(`insert into "user" (id, name, email, "emailVerified", "ageConfirmedAt", "updatedAt") values ($1, 'Testkonto Fiktiv', $2, true, now(), now())`, [id, email]);
  await query(`insert into account (id, "accountId", "providerId", "userId", password, "updatedAt") values ($1, $2, 'credential', $2, $3, now())`, [`${id}_credential`, id, await hashPassword(PASSWORD)]);
  return { id, email };
}

async function signInWith(context: APIRequestContext, account: FreshAccount): Promise<void> {
  const response = await context.post("/api/auth/sign-in/email", { data: { email: account.email, password: PASSWORD } });
  expect(response.ok(), `Anmeldung ${response.status()}`).toBe(true);
}

/** Eine zweite Sitzung desselben Kontos in einem eigenen Cookie-Speicher, wie ein anderes Gerät. */
async function secondDevice(baseURL: string | undefined, account: FreshAccount): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL, extraHTTPHeaders: { "x-real-ip": testClientIp(), "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0" } });
  await signInWith(context, account);
  return context;
}

async function hasSession(context: APIRequestContext): Promise<boolean> {
  const response = await context.get("/api/auth/get-session");
  return Boolean(await response.json());
}

async function openSecurity(page: Page, account: FreshAccount): Promise<void> {
  await signInWith(page.request, account);
  await page.goto("/de/einstellungen/sicherheit");
  await expect(page.getByRole("heading", { level: 1, name: "Sicherheit" })).toBeVisible();
}

test.describe("Sicherheit (Abnahme 16)", () => {
  test("2FA einrichten mit QR-Code, Code und Ersatzcodes, danach abschalten", async ({ page }) => {
    const account = await createAccount();
    await openSecurity(page, account);
    await page.getByRole("button", { name: "Zweiten Faktor einrichten" }).click();
    await page.locator("#zweifaktor-passwort").fill(PASSWORD);
    await page.getByRole("button", { name: "Passwort bestätigen" }).click();

    await expect(page.getByRole("img", { name: "QR-Code für die Authenticator-App" })).toBeVisible();
    const secret = await page.locator("[data-totp-secret]").getAttribute("data-totp-secret");
    expect(secret).toBeTruthy();
    await page.getByLabel("Code aus der App").fill(totp(secret ?? ""));
    await page.getByRole("button", { name: "Code bestätigen" }).click();

    const codes = page.getByRole("list", { name: "Ersatzcodes" }).getByRole("listitem");
    await expect(codes.first()).toBeVisible();
    expect(await codes.count()).toBeGreaterThanOrEqual(8);
    await expect(page.getByRole("button", { name: "Ersatzcodes herunterladen" })).toBeVisible();
    await page.getByRole("button", { name: "Einrichtung abschliessen" }).click();

    await expect(page.getByText("Der zweite Faktor ist eingerichtet.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Ereignisse" })).toContainText("Zweiten Faktor eingerichtet");
    expect((await query<{ twoFactorEnabled: boolean }>(`select "twoFactorEnabled" from "user" where id = $1`, [account.id]))[0]?.twoFactorEnabled).toBe(true);

    await page.getByLabel("Passwort zum Abschalten").fill(PASSWORD);
    await page.getByRole("button", { name: "Zweiten Faktor abschalten" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Ersatzcodes werden ungültig");
    await dialog.getByRole("button", { name: "Zweiten Faktor abschalten" }).click();
    await expect(page.getByText("Der zweite Faktor ist nicht eingerichtet.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Ereignisse" })).toContainText("Zweiten Faktor abgeschaltet");
  });

  test("Passkey hinzufügen und entfernen mit virtuellem Authenticator", async ({ page }) => {
    const account = await createAccount();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    await cdp.send("WebAuthn.addVirtualAuthenticator", {
      options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true },
    });
    await openSecurity(page, account);
    await expect(page.getByText("Noch kein Passkey gespeichert")).toBeVisible();
    await page.getByRole("button", { name: "Passkey hinzufügen" }).click();
    await expect(page.locator("[data-passkey]")).toHaveCount(1);
    await expect(page.getByRole("list", { name: "Ereignisse" })).toContainText("Passkey hinzugefügt");

    // Anmeldung mit dem Passkey: über den Button auf /anmelden, falls es ihn schon gibt, sonst über die Liste der API.
    await page.request.post("/api/auth/sign-out", { data: {} });
    await page.goto("/de/anmelden");
    const passkeyButton = page.getByRole("button", { name: /passkey/i });
    if ((await passkeyButton.count()) > 0) {
      await passkeyButton.first().click();
      await expect.poll(async () => hasSession(page.request)).toBe(true);
      // Die Anmeldung leitet selbst weiter; erst danach navigieren, sonst bricht eine die andere ab.
      await expect(page).not.toHaveURL(/\/anmelden/);
    } else {
      await signInWith(page.request, account);
      const listed = (await (await page.request.get("/api/auth/passkey/list-user-passkeys")).json()) as unknown[];
      expect(listed).toHaveLength(1);
    }

    await page.goto("/de/einstellungen/sicherheit");
    await page.locator("[data-passkey]").getByRole("button", { name: "Passkey entfernen" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("nicht mehr anmelden");
    await dialog.getByRole("button", { name: "Passkey entfernen" }).click();
    await expect(page.getByText("Noch kein Passkey gespeichert")).toBeVisible();
    await expect(page.getByRole("list", { name: "Ereignisse" })).toContainText("Passkey entfernt");
  });

  test("zweite Sitzung beenden; danach ist sie ungültig", async ({ page, baseURL }) => {
    const account = await createAccount();
    const other = await secondDevice(baseURL, account);
    await openSecurity(page, account);
    const sessions = page.getByRole("list", { name: "Aktive Sitzungen" });
    await expect(sessions.locator("[data-session]")).toHaveCount(2);
    await expect(sessions.locator("[data-session=current]")).toContainText("Dieses Gerät");
    const lastActive = sessions.locator("[data-session=other] time");
    await expect(lastActive).toHaveAttribute("title", /^\d{2}\.\d{2}\.\d{4}/);

    await sessions.locator("[data-session=other]").getByRole("button", { name: "Sitzung beenden" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Sitzung beenden" }).click();
    await expect(page.getByText("Keine weitere Sitzung")).toBeVisible();
    expect(await hasSession(other)).toBe(false);
    expect(await hasSession(page.request)).toBe(true);
    await expect(page.getByRole("list", { name: "Ereignisse" })).toContainText("Sitzung beendet");
    await other.dispose();
  });

  test("eine fremde Sitzungs-ID verhält sich wie eine unbekannte (Abnahme 24)", async ({ page, baseURL }) => {
    const [account, stranger] = await Promise.all([createAccount(), createAccount()]);
    const own = await secondDevice(baseURL, account);
    const foreign = await secondDevice(baseURL, stranger);
    const foreignId = (await query<{ id: string }>(`select id from session where "userId" = $1`, [stranger.id]))[0]?.id ?? "";
    expect(foreignId).not.toBe("");
    await openSecurity(page, account);

    // Die Server Action bekommt statt der eigenen die fremde ID, wie bei einem manipulierten Aufruf.
    await page.route("**/einstellungen/sicherheit", async (route) => {
      const body = route.request().postData();
      if (route.request().method() !== "POST" || !route.request().headers()["next-action"] || !body?.includes("sessionId")) return route.continue();
      await route.continue({ postData: body.replace(/"sessionId":"[^"]+"/, `"sessionId":"${foreignId}"`) });
    });
    await page.locator("[data-session=other]").getByRole("button", { name: "Sitzung beenden" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Sitzung beenden" }).click();
    await expect(page.getByText("Diese Sitzung gibt es nicht mehr.")).toBeVisible();
    expect(await hasSession(foreign)).toBe(true);
    expect(await hasSession(own)).toBe(true);
    await Promise.all([own.dispose(), foreign.dispose()]);
  });

  test("Passwort ändern mit «Andere Geräte abmelden» beendet die zweite Sitzung", async ({ page, baseURL }) => {
    const account = await createAccount();
    const other = await secondDevice(baseURL, account);
    await openSecurity(page, account);
    const newPassword = "neues-test-passwort-1111";
    await page.getByLabel("Aktuelles Passwort").fill(PASSWORD);
    await page.getByLabel("Neues Passwort", { exact: true }).fill(newPassword);
    await page.getByLabel("Neues Passwort wiederholen").fill("anders");
    await page.getByRole("button", { name: "Passwort ändern" }).click();
    await expect(page.getByLabel("Neues Passwort wiederholen")).toBeFocused();
    await expect(page.getByRole("alert").filter({ hasText: "Bitte prüfe diese Angaben" })).toContainText("stimmen nicht überein");

    await page.getByLabel("Neues Passwort wiederholen").fill(newPassword);
    await page.getByLabel("Andere Geräte abmelden").check();
    await page.getByRole("button", { name: "Passwort ändern" }).click();
    await expect(page.getByText("Andere Geräte sind abgemeldet.").first()).toBeVisible();
    expect(await hasSession(other)).toBe(false);
    expect(await hasSession(page.request)).toBe(true);
    await expect(page.getByRole("list", { name: "Ereignisse" })).toContainText("Passwort geändert");
    await other.dispose();
  });
});

test.describe("Daten und Konto (Abnahme 20)", () => {
  test("Export lädt JSON ohne Passwort, Geheimnis und Token", async ({ page }) => {
    const account = await createAccount();
    await signInWith(page.request, account);
    await page.goto("/de/einstellungen/daten");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Daten herunterladen" }).click();
    const file = await (await download).path();
    const data = JSON.parse(readFileSync(file, "utf8")) as { account: { email: string } };
    expect(data.account.email).toBe(account.email);
    const keys: string[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object")
        for (const [key, child] of Object.entries(value)) {
          keys.push(key);
          walk(child);
        }
    };
    walk(data);
    expect(keys.filter((key) => /password|secret|token/i.test(key))).toEqual([]);
    expect(JSON.stringify(data)).not.toMatch(/\$2[aby]\$|scrypt/);
  });

  test("Löschung beantragen beendet die Sitzung; eine Anmeldung hebt den Antrag auf", async ({ page }) => {
    const account = await createAccount();
    await signInWith(page.request, account);
    await page.goto("/de/einstellungen/daten");
    await page.getByRole("button", { name: "Löschung beantragen" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText(/Am \d{2}\.\d{2}\.\d{4} löschen wir/);
    await dialog.getByRole("button", { name: "Löschung beantragen" }).click();

    await expect(page.getByText("Löschung beantragt.").first()).toBeVisible();
    await expect(page).not.toHaveURL(/einstellungen/);
    expect(await hasSession(page.request)).toBe(false);
    const [requested] = await query<{ deletionRequestedAt: Date | null }>(`select "deletionRequestedAt" from "user" where id = $1`, [account.id]);
    expect(requested?.deletionRequestedAt).not.toBeNull();

    await signInWith(page.request, account);
    const [after] = await query<{ deletionRequestedAt: Date | null; deactivatedAt: Date | null }>(`select "deletionRequestedAt", "deactivatedAt" from "user" where id = $1`, [account.id]);
    expect(after).toEqual({ deletionRequestedAt: null, deactivatedAt: null });
    await page.goto("/de/einstellungen/sicherheit");
    const log = page.getByRole("list", { name: "Ereignisse" });
    await expect(log).toContainText("Konto reaktiviert");
    await expect(log).toContainText("Löschung beantragt");
  });

  test("Konto deaktivieren beendet alle Sitzungen", async ({ page, baseURL }) => {
    const account = await createAccount();
    const other = await secondDevice(baseURL, account);
    await signInWith(page.request, account);
    await page.goto("/de/einstellungen/daten");
    await page.getByRole("button", { name: "Konto deaktivieren" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Konto deaktivieren" }).click();
    await expect(page.getByText("Dein Konto ist deaktiviert.").first()).toBeVisible();
    expect(await hasSession(page.request)).toBe(false);
    expect(await hasSession(other)).toBe(false);
    const [row] = await query<{ deactivatedAt: Date | null }>(`select "deactivatedAt" from "user" where id = $1`, [account.id]);
    expect(row?.deactivatedAt).not.toBeNull();
    await other.dispose();
  });
});
