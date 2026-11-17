import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Page } from "@playwright/test";
import sharp from "sharp";
import { cleanup, createAccount, query, signInAs, type FreshAccount } from "./admin-fixtures";
import { expectNoHorizontalScroll, expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Medienbibliothek im Studio (PRD v2 11.3, 14.3). Jeder Test legt ein
 * frisches, fiktives Anbieterkonto mit veröffentlichtem Profil an. Dateien
 * liegen beim Treiber fs unter STORAGE_FS_ROOT; die Tests lesen sie dort nach.
 */
const ROOT = process.env.STORAGE_FS_ROOT ?? "/home/user/gotit-local/storage";
const accounts: string[] = [];
test.afterAll(async () => cleanup(accounts));

async function provider(): Promise<FreshAccount & { profileId: string }> {
  const account = await createAccount(undefined, "Medienkonto Fiktiv");
  accounts.push(account.id);
  const profileId = `e2e_${randomUUID()}`;
  await query(`update "user" set "accountType" = 'PROVIDER' where id = $1`, [account.id]);
  await query(`insert into provider_profile (id, "userId", slug, "displayName", status, "updatedAt") values ($1, $2, $3, 'Medienprofil Fiktiv', 'PUBLISHED', now())`, [
    profileId,
    account.id,
    `medien-${randomUUID()}`,
  ]);
  return { ...account, profileId };
}

/** Fiktives Foto mit GPS-Daten in EXIF; der Text «FIKTIV-GPS» steht im Klartext in der Datei. */
async function jpegWithGps(width = 1800, height = 1200): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 122, g: 106, b: 92 }, noise: { type: "gaussian", mean: 120, sigma: 20 } } })
    .withExif({ IFD0: { Make: "Fiktiv" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "47/1 22/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "8/1 32/1 0/1", GPSMapDatum: "FIKTIV-GPS" } })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function mediaRows(profileId: string) {
  return query<{ id: string; status: string; failureReason: string | null; sortOrder: number; originalKey: string; deletedAt: Date | null }>(
    `select id, status, "failureReason", "sortOrder", "originalKey", "deletedAt" from media_asset where "providerProfileId" = $1 order by "sortOrder"`,
    [profileId],
  );
}

/** Legt Medien direkt an (Status In Prüfung), mit Dateien im Speicher, für Tests, die nicht den Upload prüfen. */
async function seedMedia(profileId: string, ownerId: string, count: number): Promise<string[]> {
  const ids: string[] = [];
  const webp = await sharp({ create: { width: 320, height: 400, channels: 3, background: "#7a6a5c" } }).webp().toBuffer();
  for (let index = 0; index < count; index += 1) {
    const id = `e2e_media_${randomUUID()}`;
    const originalKey = `o/${randomBytes(24).toString("base64url")}`;
    await query(
      `insert into media_asset (id, "ownerUserId", "providerProfileId", status, "sortOrder", "isCover", "originalKey", width, height, "dominantColor", "rightsConfirmedAt", "updatedAt")
       values ($1, $2, $3, 'IN_REVIEW', $4, $5, $6, 320, 400, '#7a6a5c', now(), now())`,
      [id, ownerId, profileId, index, index === 0, originalKey],
    );
    await put(`originals/${originalKey}`, webp);
    for (const width of [320, 640, 960, 1440]) {
      for (const format of ["avif", "webp"]) {
        const key = `m/${id}/seed/w${width}.${format}`;
        await query(`insert into media_variant (id, "mediaId", name, width, height, format, key, bytes) values ($1, $2, $3, 320, 400, $4, $5, $6)`, [
          randomUUID(),
          id,
          `w${width}.${format}`,
          format,
          key,
          webp.byteLength,
        ]);
        await put(`derivatives/${key}`, webp, `image/${format}`);
      }
    }
    ids.push(id);
  }
  return ids;
}

/** Legt eine Datei ab wie der Treiber fs: Inhalt und daneben der Inhaltstyp in `<datei>.type`. */
async function put(path: string, body: Buffer, contentType = "image/webp"): Promise<void> {
  await mkdir(dirname(join(ROOT, path)), { recursive: true });
  await writeFile(join(ROOT, path), body);
  await writeFile(join(ROOT, `${path}.type`), contentType);
}

async function exists(path: string): Promise<boolean> {
  return stat(join(ROOT, path)).then(
    () => true,
    () => false,
  );
}

async function openLibrary(page: Page, account: FreshAccount): Promise<void> {
  await signInAs(page, account, `http://localhost:${process.env.PORT ?? 3000}`);
  await page.goto("/de/studio/medien");
  await expect(page.getByRole("heading", { level: 1, name: "Medien" })).toBeVisible();
  // Erst nach der Hydrierung reagieren Menüs und Ablage auf Eingaben.
  await page.waitForLoadState("networkidle");
}

const fileInput = (page: Page) => page.locator("[data-upload-panel] input[type=file]");
const tile = (page: Page, id: string) => page.locator(`[data-media-id="${id}"]`);

test.describe("Medienbibliothek: Upload (PRD v2 11.3, 14.3)", () => {
  test("ohne Bestätigung der Rechte beginnt kein Upload; das Feld erklärt, was fehlt", async ({ page }) => {
    const account = await provider();
    await openLibrary(page, account);
    await expect(page.getByText("EXIF- und GPS-Daten werden entfernt")).toBeVisible();
    await expect(page.getByText("Noch keine Medien")).toBeVisible();
    await fileInput(page).setInputFiles({ name: "foto.jpg", mimeType: "image/jpeg", buffer: await jpegWithGps(400, 300) });
    await expect(page.getByText("Bestätige die Rechte und Einwilligungen, bevor du Fotos hochlädst.")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Ich habe die Rechte an diesen Fotos/ })).toBeFocused();
    await page.waitForTimeout(500);
    expect(await mediaRows(account.profileId)).toHaveLength(0);
  });

  test("Upload mit Fortschritt, danach In Prüfung; Original und alle Varianten ohne GPS", async ({ page }) => {
    const account = await provider();
    await openLibrary(page, account);
    await page.getByRole("checkbox", { name: /Ich habe die Rechte an diesen Fotos/ }).click();
    // Die Antwort des Speichers hält kurz an, damit der Fortschritt sichtbar bleibt.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/storage/upload/**", async (route) => {
      await held;
      await route.continue();
    });
    await fileInput(page).setInputFiles({ name: "fiktives-foto.jpg", mimeType: "image/jpeg", buffer: await jpegWithGps() });
    const item = page.getByRole("listitem").filter({ hasText: "fiktives-foto.jpg" });
    await expect(item.locator("progress")).toBeVisible();
    await expect(item.getByText(/% hochgeladen/)).toBeVisible();
    release();
    await expect(item.getByText("Hochgeladen, wird verarbeitet")).toBeVisible();

    const [row] = await mediaRows(account.profileId);
    expect(row).toBeDefined();
    await expect(tile(page, row?.id ?? "").getByText("In Prüfung")).toBeVisible({ timeout: 30_000 });
    await expect(tile(page, row?.id ?? "").getByText("Öffentlich")).toBeVisible();
    await expect(tile(page, row?.id ?? "").getByText("Titelbild")).toBeVisible();

    const variants = await query<{ key: string; name: string }>(`select key, name from media_variant where "mediaId" = $1`, [row?.id]);
    expect(variants).toHaveLength(8);
    for (const path of [...variants.map((variant) => `derivatives/${variant.key}`), `originals/${row?.originalKey}`]) {
      const body = await readFile(join(ROOT, path));
      expect(body.includes(Buffer.from("FIKTIV-GPS")), path).toBe(false);
      expect((await sharp(body).metadata()).exif, path).toBeUndefined();
    }
    await page.reload();
    await expect(page.getByText("EXIF- und GPS-Daten werden entfernt")).toHaveCount(0);
  });

  test("Text mit Endung .jpg: Nicht verarbeitet, mit Grund, Original gelöscht", async ({ page }) => {
    const account = await provider();
    await openLibrary(page, account);
    await page.getByRole("checkbox", { name: /Ich habe die Rechte an diesen Fotos/ }).click();
    await fileInput(page).setInputFiles({ name: "kein-bild.jpg", mimeType: "image/jpeg", buffer: Buffer.from("Fiktiver Text, kein Bild. ".repeat(20)) });
    await expect(page.getByText("Hochgeladen, wird verarbeitet")).toBeVisible();
    const [row] = await mediaRows(account.profileId);
    await expect(tile(page, row?.id ?? "").getByText("Nicht verarbeitet")).toBeVisible({ timeout: 30_000 });
    await expect(tile(page, row?.id ?? "").getByText("Die Datei ist kein JPEG-, PNG-, WebP- oder HEIC-Bild.")).toBeVisible();
    expect((await mediaRows(account.profileId))[0]).toMatchObject({ status: "FAILED", failureReason: "unsupported-type" });
    expect(await exists(`originals/${row?.originalKey}`)).toBe(false);
  });
});

test.describe("Medienbibliothek: ordnen und löschen", () => {
  test("Reihenfolge per Tastatur mit «Nach vorne» und «Nach hinten»", async ({ page }) => {
    const account = await provider();
    const [first, second, third] = (await seedMedia(account.profileId, account.id, 3)) as [string, string, string];
    await openLibrary(page, account);
    const order = async () => (await mediaRows(account.profileId)).map((entry) => entry.id);

    await page.locator(`[data-media-menu="${third}"]`).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Home");
    await expect(page.getByRole("menuitem", { name: "Nach vorne" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(order).toEqual([first, third, second]);
    await expect(page.getByRole("status").filter({ hasText: "Das Medium an Position 3 steht jetzt an Position 2." })).toBeAttached();
    await expect(page.locator("[data-media-grid] > li").nth(1)).toHaveAttribute("data-media-id", third);
    await expect(page.locator(`[data-media-menu="${third}"]`)).toBeFocused();

    await page.locator(`[data-media-menu="${first}"]`).focus();
    await page.keyboard.press("Enter");
    // An erster Stelle ist «Nach vorne» deaktiviert; Pos1 springt zum ersten wählbaren Eintrag.
    await expect(page.getByRole("menuitem", { name: "Nach vorne" })).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Home");
    await expect(page.getByRole("menuitem", { name: "Nach hinten" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(order).toEqual([third, first, second]);
  });

  test("Löschen mit Dialog «Medium löschen» entfernt Original und Varianten", async ({ page }) => {
    const account = await provider();
    const [id] = (await seedMedia(account.profileId, account.id, 1)) as [string];
    const [row] = await mediaRows(account.profileId);
    const keys = (await query<{ key: string }>(`select key from media_variant where "mediaId" = $1`, [id])).map((entry) => `derivatives/${entry.key}`);
    await openLibrary(page, account);
    await page.locator(`[data-media-menu="${id}"]`).click();
    await page.getByRole("menuitem", { name: "Medium löschen" }).click();
    const dialog = page.getByRole("alertdialog", { name: "Dieses Medium endgültig löschen?" });
    await expect(dialog).toContainText("Das lässt sich nicht rückgängig machen.");
    await dialog.getByRole("button", { name: "Medium löschen" }).click();
    await expect(page.getByText("Noch keine Medien")).toBeVisible();
    expect((await mediaRows(account.profileId))[0]?.deletedAt).not.toBeNull();
    await expect.poll(async () => (await Promise.all([`originals/${row?.originalKey}`, ...keys].map(exists))).some(Boolean), { timeout: 15_000 }).toBe(false);
    await expect.poll(async () => (await query(`select 1 from audit_event where target = $1 and action = 'media.purged'`, [`media:${id}`])).length).toBe(1);
  });

  test("Detailseite: Alternativtext, Sichtbarkeit und Hinweis der Moderation; fremde IDs ergeben 404", async ({ page }) => {
    const account = await provider();
    const [id] = (await seedMedia(account.profileId, account.id, 1)) as [string];
    await query(`update media_asset set status = 'CHANGES_REQUESTED', "moderationNote" = 'Fiktiver Hinweis: Bitte ein schärferes Foto verwenden.' where id = $1`, [id]);
    await openLibrary(page, account);
    await tile(page, id).getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1, name: "Medium bearbeiten" })).toBeVisible();
    await expect(page.getByText("Die Moderation bittet um eine Korrektur")).toBeVisible();
    await expect(page.locator("[data-moderation-note]")).toHaveText("Fiktiver Hinweis: Bitte ein schärferes Foto verwenden.");
    await page.getByLabel("Alternativtext").fill("Fiktives Porträt im Gegenlicht");
    await page.getByRole("button", { name: "Alternativtext speichern" }).click();
    await expect(page.getByText("Alternativtext gespeichert", { exact: true })).toBeVisible();
    await page.getByRole("switch", { name: "Nur für Mitglieder sichtbar" }).click();
    await expect(page.getByText("Gespeichert", { exact: true })).toBeVisible();
    expect((await query<{ altText: string; visibility: string }>(`select "altText", visibility from media_asset where id = $1`, [id]))[0]).toEqual({
      altText: "Fiktives Porträt im Gegenlicht",
      visibility: "MEMBERS",
    });
    await expectNoSeriousAxeFindings(page);

    const stranger = await provider();
    await signInAs(page, stranger, `http://localhost:${process.env.PORT ?? 3000}`);
    const response = await page.goto(`/de/studio/medien/${id}`);
    expect(response?.status()).toBe(404);
    expect((await page.goto("/de/studio/medien/gibt-es-nicht"))?.status()).toBe(404);
  });

  test("axe ohne schwere Befunde; bei 320 px kein horizontales Scrollen", async ({ page }) => {
    const account = await provider();
    const [id] = (await seedMedia(account.profileId, account.id, 2)) as [string, string];
    await openLibrary(page, account);
    await page.locator(`[data-media-id="${id}"]`).getByRole("checkbox").click();
    await expect(page.getByText("1 Medium ausgewählt")).toBeVisible();
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await expectNoHorizontalScroll(page);
    await page.goto(`/de/studio/medien/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: "Medium bearbeiten" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
