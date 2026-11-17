import sharp from "sharp";
import { cleanup, query } from "./admin-fixtures";
import {
  createConversation,
  createMember,
  createProvider,
  signedInPage,
  threadLog,
} from "./messages-fixtures";
import { expect, test } from "./support/test";

/**
 * Schutz im Messenger (v1 FR-CHAT-005, Abnahme 20.4, Entscheid 0014):
 * Blockieren ohne Hinweis an die Gegenseite, Melden an die Moderation, kein
 * Zugang für Unbeteiligte und Bilder ohne EXIF und GPS.
 */
const created: string[] = [];
const reported: string[] = [];
test.afterAll(async () => {
  if (reported.length > 0)
    await query(`delete from report where "targetId" = any($1)`, [reported]);
  await cleanup(created);
});

test.describe("Messenger: Schutz", () => {
  test("blockieren: die Gegenseite sieht «nicht zustellbar» ohne Hinweis; aufheben stellt wieder zu", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const conversationId = await createConversation(member, provider, [
      {
        from: "member",
        body: "Erste Nachricht vor dem Blockieren.",
        minutesAgo: 10,
      },
    ]);
    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto(`/de/studio/nachrichten/${conversationId}`);
    const context = studio.getByRole("complementary", {
      name: "Details zur Unterhaltung",
    });
    await context.getByRole("button", { name: "Kontakt blockieren" }).click();
    await expect(
      studio.getByText("Kontakt blockiert", { exact: true }),
    ).toBeVisible();
    await expect(
      studio.getByText("Du hast diesen Kontakt blockiert."),
    ).toBeVisible();
    await expect(
      studio.getByRole("textbox", { name: /^Nachricht an/ }),
    ).toHaveCount(0);

    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/nachrichten/${conversationId}`);
    await page
      .getByRole("textbox", { name: `Nachricht an ${provider.displayName}` })
      .fill("Bist du noch da?");
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    const failed = threadLog(page)
      .getByRole("listitem")
      .filter({ hasText: "Bist du noch da?" });
    await expect(failed).toContainText("Fehlgeschlagen");
    await expect(failed).toContainText(
      "Die Nachricht konnte nicht zugestellt werden.",
    );
    // Sichtbar steht nirgends, dass blockiert wurde (die Seite trägt nur die Übersetzungen der Oberfläche).
    expect(
      (await page.locator("body").innerText()).toLowerCase(),
    ).not.toContain("blockiert");
    expect(
      await query(
        `select id from message where "conversationId" = $1 and body = 'Bist du noch da?'`,
        [conversationId],
      ),
    ).toHaveLength(0);

    await studio
      .getByRole("button", { name: "Blockierung aufheben" })
      .first()
      .click();
    await expect(
      studio.getByText("Blockierung aufgehoben", { exact: true }),
    ).toBeVisible();
    await expect(
      studio.getByRole("textbox", { name: /^Nachricht an/ }),
    ).toBeVisible();
    await failed.getByRole("button", { name: "Erneut senden" }).click();
    await expect(failed).toContainText("Gesendet");
    await expect(threadLog(studio)).toContainText("Bist du noch da?", {
      timeout: 10_000,
    });
  });

  test("Nachricht melden in zwei Schritten legt einen offenen Fall mit Kopie an; die Gegenseite melden ebenso", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const conversationId = await createConversation(member, provider, [
      {
        from: "provider",
        body: "Schick mir zuerst Geld per Gutschein.",
        minutesAgo: 10,
      },
    ]);
    const [message] = await query<{ id: string }>(
      `select id from message where "conversationId" = $1`,
      [conversationId],
    );
    reported.push(message?.id ?? "", provider.profileId);
    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/nachrichten/${conversationId}`);
    await threadLog(page)
      .getByRole("listitem")
      .filter({ hasText: "Gutschein" })
      .getByRole("button", { name: "Aktionen zur Nachricht" })
      .click();
    await page.getByRole("menuitem", { name: "Nachricht melden" }).click();
    const dialog = page.getByRole("dialog", { name: "Nachricht melden" });
    await expect(dialog).toContainText("Schritt 1 von 2");
    await dialog
      .getByRole("radio", { name: "Betrug oder Forderung nach Geld" })
      .click();
    await dialog.getByRole("button", { name: "Beschreibung ergänzen" }).click();
    await expect(dialog).toContainText("Schritt 2 von 2");
    await dialog
      .getByRole("textbox", { name: /Was ist passiert/ })
      .fill("Verlangt Vorauszahlung.");
    await dialog.getByRole("button", { name: "Meldung senden" }).click();
    await expect(dialog.getByText("Meldung gesendet")).toBeVisible();
    await dialog.getByRole("button", { name: "Fertig" }).click();
    const [report] = await query<{
      reason: string;
      status: string;
      targetType: string;
      evidence: { body: string };
    }>(
      `select reason, status, "targetType", evidence from report where "targetId" = $1`,
      [message?.id],
    );
    expect(report).toMatchObject({
      reason: "scam",
      status: "OPEN",
      targetType: "MESSAGE",
    });
    expect(report?.evidence.body).toBe("Schick mir zuerst Geld per Gutschein.");

    await page
      .getByRole("complementary", { name: "Details zur Unterhaltung" })
      .getByRole("button", { name: "Profil melden" })
      .click();
    const counterpart = page.getByRole("dialog", { name: "Kontakt melden" });
    await counterpart.getByRole("radio", { name: "Akute Gefahr" }).click();
    await expect(counterpart).toContainText("117");
    await counterpart
      .getByRole("button", { name: "Beschreibung ergänzen" })
      .click();
    await counterpart.getByRole("button", { name: "Meldung senden" }).click();
    await expect(counterpart.getByText("Meldung gesendet")).toBeVisible();
    const [profileReport] = await query<{
      urgent: boolean;
      targetType: string;
    }>(`select urgent, "targetType" from report where "targetId" = $1`, [
      provider.profileId,
    ]);
    expect(profileReport).toEqual({ urgent: true, targetType: "PROFILE" });
  });

  test("fremde Unterhaltung: 404 für ein anderes Mitglied und einen anderen Anbieter, auch für Bilder", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const conversationId = await createConversation(member, provider, [
      { from: "member", body: "Nur für uns beide.", minutesAgo: 10 },
    ]);
    const stranger = await signedInPage(
      browser,
      await createMember(created),
      baseURL,
    );
    const response = await stranger.goto(`/de/nachrichten/${conversationId}`);
    expect(response?.status()).toBe(404);
    expect(await stranger.content()).not.toContain("Nur für uns beide.");
    expect(
      (await stranger.goto("/de/nachrichten/gibt-es-nicht"))?.status(),
    ).toBe(404);

    const otherProvider = await signedInPage(
      browser,
      await createProvider(created),
      baseURL,
    );
    expect(
      (
        await otherProvider.goto(`/de/studio/nachrichten/${conversationId}`)
      )?.status(),
    ).toBe(404);
    expect(
      (await otherProvider.goto(`/de/nachrichten/${conversationId}`))?.status(),
    ).toBe(404);
    expect(
      (
        await otherProvider.request.get(
          "/api/nachrichten/bilder/gibt-es-nicht",
          { maxRedirects: 0 },
        )
      ).status(),
    ).toBe(404);
  });

  test("Bild senden: Fortschritt, Vorschau, Ankunft ohne EXIF und GPS, grosse Ansicht mit Namen", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const conversationId = await createConversation(member, provider);
    const photo = await sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: { r: 120, g: 90, b: 60 },
      },
    })
      .jpeg()
      .withExif({
        IFD0: { Make: "FiktivKamera", Model: "Test 1" },
        IFD3: {
          GPSLatitudeRef: "N",
          GPSLatitude: "47/1 22/1 0/1",
          GPSLongitudeRef: "E",
          GPSLongitude: "8/1 32/1 0/1",
        },
      })
      .toBuffer();
    expect((await sharp(photo).metadata()).exif).toBeDefined();

    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/nachrichten/${conversationId}`);
    const images = page.getByRole("list", { name: "Angehängte Bilder" });
    // Erst nach der Hydrierung nimmt das Feld Dateien an; bis dahin erneut wählen.
    await expect(async () => {
      await page.locator("[data-image-input]").setInputFiles([
        { name: "standort.jpg", mimeType: "image/jpeg", buffer: photo },
        {
          name: "notiz.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("kein Bild"),
        },
      ]);
      await expect(images).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    await expect(images.locator("[data-composer-image=failed]")).toContainText(
      "Nur JPEG, PNG oder WebP.",
    );
    await expect(images.locator("[data-composer-image=ready]")).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Entferne zuerst die Bilder" }),
    ).toBeVisible();
    await images.getByRole("button", { name: "Bild 2 entfernen" }).click();
    await page
      .getByRole("textbox", { name: `Nachricht an ${provider.displayName}` })
      .fill("So sieht es aus.");
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    const sent = threadLog(page)
      .getByRole("listitem")
      .filter({ hasText: "So sieht es aus." });
    await expect(sent).toContainText("Gesendet");

    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto(`/de/studio/nachrichten/${conversationId}`);
    const image = threadLog(studio).getByRole("img", {
      name: "Bild von Mitglied seit",
    });
    await expect(image).toBeVisible();
    const attachmentId = await image.getAttribute("data-chat-image");
    const download = await studio.request.get(
      `/api/nachrichten/bilder/${attachmentId}`,
    );
    expect(download.ok()).toBe(true);
    expect(download.headers()["cache-control"]).toContain("no-store");
    const metadata = await sharp(await download.body()).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
    // Unbeteiligte erhalten das Bild nicht.
    const stranger = await signedInPage(
      browser,
      await createMember(created),
      baseURL,
    );
    expect(
      (
        await stranger.request.get(`/api/nachrichten/bilder/${attachmentId}`, {
          maxRedirects: 0,
        })
      ).status(),
    ).toBe(404);

    await threadLog(studio)
      .getByRole("button", { name: /Bild von Mitglied seit/ })
      .click();
    const viewer = studio.getByRole("dialog", {
      name:
        "Bilder in der Unterhaltung mit Mitglied seit " +
        new Date().getFullYear(),
    });
    await expect(viewer).toBeVisible();
    await studio.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
  });
});
