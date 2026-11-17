import { randomUUID } from "node:crypto";
import { cleanup, query, signInAdmin } from "./admin-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { latestMail, mailCount, uniqueEmail } from "./support/outbox";
import { signIn } from "./support/session";
import { expect, test } from "./support/test";

/**
 * Kontakt und Melden ohne Konto (v2 7.8): Das Kontaktformular legt eine
 * Anfrage an, der Support antwortet per E-Mail; /melden legt einen Fall an,
 * den die Moderation sieht.
 */
const users: string[] = [];
const emails: string[] = [];
test.afterEach(async () => {
  if (emails.length) await query(`delete from support_ticket where email = any($1)`, [emails.splice(0)]);
  await cleanup(users.splice(0));
});

test.describe("Kontakt und Melden", () => {
  test("Kontaktformular ohne Konto legt eine Anfrage an; der Support antwortet", async ({ page, browser, baseURL }) => {
    const email = uniqueEmail("kontakt");
    emails.push(email);
    await page.goto("/de/kontakt");
    await expect(page.getByRole("heading", { level: 1, name: "Kontakt" })).toBeVisible();
    await expectNoSeriousAxeFindings(page);
    await page.getByRole("button", { name: "Anfrage senden" }).click();
    await expect(page.getByText("4 Felder brauchen eine Korrektur")).toBeVisible();
    await expect(page.getByRole("link", { name: "Wähle ein Thema." })).toBeVisible();

    await page.getByRole("combobox", { name: "Worum geht es?" }).click();
    await page.getByRole("option", { name: "Einspruch gegen eine Sperre" }).click();
    await expect(page.getByText("Nenne den Benutzernamen des gesperrten Kontos")).toBeVisible();
    await page.getByLabel("E-Mail-Adresse").fill(email);
    await page.getByLabel("Betreff").fill("Sperre meines Kontos");
    await page.getByLabel("Nachricht").fill("Mein Konto wurde gesperrt, ich verstehe nicht warum. Bitte prüft das.");
    await page.getByRole("button", { name: "Anfrage senden" }).click();
    const sent = page.locator("[data-contact-sent]");
    await expect(sent).toContainText(/Deine Anfrage hat die Nummer S-\d+/);
    await expect(sent).toContainText(`Eine Bestätigung ist an ${email} unterwegs.`);
    const reference = (await sent.textContent())?.match(/S-\d+/)?.[0] ?? "";
    const ticket = (await query<{ id: string; category: string; userId: string | null }>(`select id, category, "userId" from support_ticket where email = $1`, [email]))[0];
    expect(ticket).toMatchObject({ category: "appeal", userId: null });
    expect((await latestMail(email)).subject).toContain(reference);

    const supportContext = await browser.newContext({ baseURL });
    const support = await supportContext.newPage();
    users.push((await signInAdmin(support, baseURL, "SUPPORT")).id);
    await support.goto("/de/admin/support?status=OPEN");
    await expectNoSeriousAxeFindings(support);
    await support.locator(`[data-ticket-link="${reference}"]`).locator("visible=true").click();
    await expect(support.getByRole("heading", { level: 1, name: `${reference} · Sperre meines Kontos` })).toBeVisible();
    await expect(support.locator("[data-ticket-body]")).toContainText("Mein Konto wurde gesperrt");
    await expect(support.getByText(`Eine Antwort geht im Wortlaut per E-Mail an ${email}`)).toBeVisible();
    await expectNoSeriousAxeFindings(support);

    const before = await mailCount(email);
    const reply = support.locator('[data-admin-form="antwort"]');
    await reply.getByLabel("Text", { exact: true }).fill("Interne Notiz: Konto prüfen.");
    await reply.getByRole("checkbox", { name: "Als interne Notiz speichern" }).click();
    await reply.getByRole("button", { name: "Antwort speichern" }).click();
    await expect(support.locator('[data-reply="internal"]')).toContainText("Interne Notiz: Konto prüfen.");

    await reply.getByLabel("Text", { exact: true }).fill("Wir haben die Sperre geprüft und melden uns bis morgen.");
    await reply.getByRole("button", { name: "Antwort speichern" }).click();
    await expect(support.locator('[data-reply="public"]')).toContainText("Wir haben die Sperre geprüft");
    await expect(async () => expect(await mailCount(email)).toBe(before + 1)).toPass({ timeout: 15_000 });
    expect((await latestMail(email)).text).toContain("Wir haben die Sperre geprüft und melden uns bis morgen.");
    expect((await query<{ status: string }>(`select status from support_ticket where id = $1`, [ticket?.id]))[0]?.status).toBe("ANSWERED");

    await support.getByRole("button", { name: "Mir zuweisen" }).click();
    await expect(support.getByRole("button", { name: "Zuweisung lösen" })).toBeVisible();
    await supportContext.close();
  });

  test("mit Konto ist die E-Mail-Adresse fest", async ({ page }) => {
    await signIn(page, "mitglied");
    await page.goto("/de/kontakt?kategorie=account");
    await expect(page.getByLabel("E-Mail-Adresse")).toHaveAttribute("readonly", "");
    await expect(page.getByRole("combobox", { name: "Worum geht es?" })).toContainText("Konto und Anmeldung");
  });

  test("/melden legt einen Fall an, den die Moderation sieht", async ({ page, browser, baseURL }) => {
    const path = `/de/ch/e2e-${randomUUID().slice(0, 8)}`;
    await page.goto(`/de/melden?url=${encodeURIComponent(`${baseURL}${path}`)}`);
    await expect(page.getByLabel("Adresse des Inhalts")).toHaveValue(`${baseURL}${path}`);
    await expectNoSeriousAxeFindings(page);
    await page.getByRole("button", { name: "Meldung senden" }).click();
    await expect(page.getByRole("link", { name: "Wähle einen Grund." })).toBeVisible();
    await page.getByLabel("Adresse des Inhalts").fill("https://fremd.example/de/p/irgendwer");
    await page.getByRole("radio", { name: "Akute Gefahr" }).click();
    await expect(page.getByText("Die Meldung geht sofort an Trust & Safety.")).toBeVisible();
    await page.getByRole("button", { name: "Meldung senden" }).click();
    await expect(page.getByText("Das ist keine Adresse dieser Plattform.").first()).toBeVisible();
    await page.getByLabel("Adresse des Inhalts").fill(`${baseURL}${path}`);
    await page.getByLabel(/^Was ist passiert/).fill("Drohung gegen eine Person auf dieser Seite.");
    await page.getByRole("button", { name: "Meldung senden" }).click();
    await expect(page.locator("[data-report-sent]")).toContainText("geht die Meldung sofort an Trust & Safety");
    const report = (await query<{ id: string; priority: string; targetType: string }>(`select id, priority, "targetType" from report where "targetUrl" = $1`, [path]))[0];
    expect(report).toMatchObject({ priority: "CRITICAL", targetType: "URL" });

    const adminContext = await browser.newContext({ baseURL });
    const admin = await adminContext.newPage();
    users.push((await signInAdmin(admin, baseURL, "TRUST_SAFETY")).id);
    await admin.goto("/de/admin/moderation?art=adresse");
    await expect(admin.locator(`[data-case-link="${report?.id}"]`).locator("visible=true")).toBeVisible();
    await adminContext.close();
    await query(`delete from report where id = $1`, [report?.id]);
  });
});
