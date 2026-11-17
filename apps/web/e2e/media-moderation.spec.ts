import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { request as playwrightRequest } from "@playwright/test";
import sharp from "sharp";
import { cleanup, createAccount, query, signInAdmin, signInAs, type FreshAccount } from "./admin-fixtures";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test, testClientIp } from "./support/test";

/**
 * Moderation und Auslieferung der Medien (PRD v2 12.4, 14.3). Medien werden
 * mit echten Varianten im Speicher angelegt; der Upload selbst ist in
 * media-library.spec.ts geprüft.
 */
const ROOT = process.env.STORAGE_FS_ROOT ?? "/home/user/gotit-local/storage";
const accounts: string[] = [];
test.afterAll(async () => cleanup(accounts));

async function provider(name = "Moderationsprofil Fiktiv"): Promise<FreshAccount & { profileId: string }> {
  const account = await createAccount(undefined, "Medienkonto Fiktiv");
  accounts.push(account.id);
  const profileId = `e2e_${randomUUID()}`;
  await query(`update "user" set "accountType" = 'PROVIDER' where id = $1`, [account.id]);
  await query(`insert into provider_profile (id, "userId", slug, "displayName", status, "updatedAt") values ($1, $2, $3, $4, 'PUBLISHED', now())`, [
    profileId,
    account.id,
    `moderation-${randomUUID()}`,
    name,
  ]);
  return { ...account, profileId };
}

/** Legt eine Datei ab wie der Treiber fs: Inhalt und daneben der Inhaltstyp in `<datei>.type`. */
async function put(path: string, body: Buffer, contentType: string): Promise<void> {
  await mkdir(dirname(join(ROOT, path)), { recursive: true });
  await writeFile(join(ROOT, path), body);
  await writeFile(join(ROOT, `${path}.type`), contentType);
}

/** Ein verarbeitetes Medium mit allen acht Varianten im Speicher. */
async function seedMedium(owner: FreshAccount & { profileId: string }, status: string, visibility: "PUBLIC" | "MEMBERS" = "PUBLIC"): Promise<string> {
  const id = `e2e_media_${randomUUID()}`;
  await query(
    `insert into media_asset (id, "ownerUserId", "providerProfileId", status, visibility, "originalKey", width, height, "dominantColor", "rightsConfirmedAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 640, 800, '#7a6a5c', now(), now())`,
    [id, owner.id, owner.profileId, status, visibility, `o/${randomBytes(24).toString("base64url")}`],
  );
  for (const width of [320, 640, 960, 1440]) {
    for (const format of ["avif", "webp"] as const) {
      const body = await sharp({ create: { width: Math.min(width, 640), height: 800, channels: 3, background: "#7a6a5c" } })[format]().toBuffer();
      const key = `m/${id}/seed/w${width}.${format}`;
      await put(`derivatives/${key}`, body, `image/${format}`);
      await query(`insert into media_variant (id, "mediaId", name, width, height, format, key, bytes) values ($1, $2, $3, $4, 800, $5, $6, $7)`, [
        randomUUID(),
        id,
        `w${width}.${format}`,
        Math.min(width, 640),
        format,
        key,
        body.byteLength,
      ]);
    }
  }
  return id;
}

async function anonymous(baseURL: string | undefined) {
  return playwrightRequest.newContext({ baseURL, extraHTTPHeaders: { "x-real-ip": testClientIp() } });
}

test.describe("Moderation der Medien (PRD v2 12.4)", () => {
  test("Vorschau zuerst verdeckt; Freigeben mit Begründung macht das Medium veröffentlicht", async ({ page, baseURL }) => {
    const owner = await provider();
    const id = await seedMedium(owner, "IN_REVIEW");
    const admin = await signInAdmin(page, baseURL, "MODERATOR");
    accounts.push(admin.id);
    await page.goto("/de/admin/medien");
    await expect(page.getByRole("heading", { level: 1, name: "Medien" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Bereiche des Admins" }).getByRole("link", { name: /Medien/ })).toHaveAttribute("aria-current", "page");
    await expectNoSeriousAxeFindings(page);
    await page.locator(`[data-media-case-link="${id}"]`).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Medium von Moderationsprofil Fiktiv" })).toBeVisible();
    await expect(page.locator("[data-media-preview=hidden]")).toBeVisible();
    await expect(page.locator("[data-media-preview] img")).toHaveCount(0);
    await expectNoSeriousAxeFindings(page);
    await page.getByRole("button", { name: "Medium anzeigen" }).click();
    const image = page.locator("[data-media-preview=shown] img");
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(page.getByRole("alert").first()).toContainText("Wähle einen Entscheid.");
    await page.getByRole("radio", { name: "Freigeben" }).click();
    await page.getByLabel("Begründung").fill("Foto entspricht den Richtlinien, keine identifizierenden Details.");
    await page.getByRole("combobox", { name: "Regel" }).click();
    await page.getByRole("option", { name: /^M-1/ }).click();
    await page.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(page.getByText("Entscheid gespeichert", { exact: true })).toBeVisible();
    await expect.poll(async () => (await query<{ status: string }>(`select status from media_asset where id = $1`, [id]))[0]?.status).toBe("PUBLISHED");
    expect(await query(`select 1 from audit_event where target = $1 and action = 'media.published' and "actorId" = $2`, [`media:${id}`, admin.id])).toHaveLength(1);

    await signInAs(page, owner, baseURL);
    await page.goto("/de/studio/medien");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(`[data-media-id="${id}"]`).getByText("Veröffentlicht")).toBeVisible();
  });

  test("ohne Prüfrolle: Bereich erklärt, Vorschau-Route 404", async ({ page, baseURL }) => {
    const owner = await provider();
    const id = await seedMedium(owner, "IN_REVIEW");
    const support = await signInAdmin(page, baseURL, "SUPPORT");
    accounts.push(support.id);
    await page.goto(`/de/admin/medien/${id}`);
    await expect(page.getByText("Dieser Bereich ist für Prüfung und Moderation")).toBeVisible();
    expect((await page.request.get(`/media/review/${id}/w960.webp`)).status()).toBe(404);
    await page.setViewportSize({ width: 320, height: 800 });
    await expectNoHorizontalScroll(page);
  });
});

test.describe("Auslieferung unter /media/[id]/[variante] (PRD v2 14.3)", () => {
  test("öffentlich und freigegeben: ohne Anmeldung, mit langem Cache", async ({ baseURL }) => {
    const owner = await provider();
    const id = await seedMedium(owner, "PUBLISHED");
    const context = await anonymous(baseURL);
    const response = await context.get(`/media/${id}/w640.webp`);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(response.headers()["content-type"]).toBe("image/webp");
    expect((await sharp(await response.body()).metadata()).format).toBe("webp");
    expect((await context.get(`/media/${id}/w641.webp`)).status()).toBe(404);
    expect((await context.get(`/media/${id}/original`)).status()).toBe(404);
    await context.dispose();
  });

  test("nur für Mitglieder: ohne Anmeldung 404, angemeldet kurzlebige Weiterleitung ohne Cache", async ({ page, baseURL }) => {
    const owner = await provider();
    const id = await seedMedium(owner, "PUBLISHED", "MEMBERS");
    const context = await anonymous(baseURL);
    const hidden = await context.get(`/media/${id}/w320.avif`, { maxRedirects: 0 });
    expect(hidden.status()).toBe(404);
    expect(hidden.headers()["cache-control"]).toBe("private, no-store");
    await context.dispose();

    const member = await createAccount(undefined, "Mitglied Fiktiv");
    accounts.push(member.id);
    await signInAs(page, member, baseURL);
    const redirect = await page.request.get(`/media/${id}/w320.avif`, { maxRedirects: 0 });
    expect(redirect.status()).toBe(302);
    expect(redirect.headers()["cache-control"]).toBe("private, no-store");
    const location = redirect.headers().location ?? "";
    expect(location).toMatch(/^\/api\/storage\/object\//);
    const image = await page.request.get(location);
    expect(image.status()).toBe(200);
    expect(image.headers()["cache-control"]).toBe("private, no-store");
    expect(image.headers()["content-type"]).toBe("image/avif");
  });

  test("fremde Medien in Prüfung und unbekannte IDs antworten gleich mit 404; der Eigentümer sieht sein Medium", async ({ page, baseURL }) => {
    const owner = await provider();
    const id = await seedMedium(owner, "IN_REVIEW");
    const stranger = await provider("Fremdes Profil Fiktiv");
    await signInAs(page, stranger, baseURL);
    const foreign = await page.request.get(`/media/${id}/w320.webp`, { maxRedirects: 0 });
    const unknown = await page.request.get(`/media/gibt-es-nicht/w320.webp`, { maxRedirects: 0 });
    expect([foreign.status(), unknown.status()]).toEqual([404, 404]);
    expect(foreign.headers()["cache-control"]).toBe(unknown.headers()["cache-control"]);
    expect(await foreign.body()).toEqual(await unknown.body());

    await signInAs(page, owner, baseURL);
    expect((await page.request.get(`/media/${id}/w320.webp`, { maxRedirects: 0 })).status()).toBe(302);
    await query(`update media_asset set status = 'FAILED' where id = $1`, [id]);
    expect((await page.request.get(`/media/${id}/w320.webp`, { maxRedirects: 0 })).status()).toBe(404);
  });
});
