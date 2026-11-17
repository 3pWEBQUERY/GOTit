import { cleanup, query } from "./admin-fixtures";
import {
  createConversation,
  createMember,
  createProvider,
  inboxRow,
  messageCount,
  setReadReceipts,
  signedInPage,
  threadLog,
} from "./messages-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { confirmAge } from "./support/session";
import { expect, test } from "./support/test";

/**
 * Messenger, Grundablauf (v1 FR-CHAT-001, Abnahme 20.4, Entscheid 0014):
 * Beginnen auf dem Profil, Senden, Ankunft in Echtzeit, gelesen, Lesebestätigung,
 * erneutes Senden ohne Dublette und Löschen.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

test.describe("Messenger: Grundablauf", () => {
  test("Besucher kommen über die Anmeldung zurück; Mitglied beginnt auf dem Profil, Anbieter sieht die Nachricht ohne Neuladen, danach gelesen", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);

    const visitorContext = await browser.newContext();
    const visitor = await visitorContext.newPage();
    await confirmAge(visitor, `/de/p/${provider.slug}`);
    const start = visitor
      .locator("[data-contact-bar=panel]")
      .getByRole("link", { name: "Nachricht schreiben" });
    await expect(start).toHaveAttribute(
      "href",
      new RegExp(`/de/anmelden\\?weiter=%2Fde%2Fp%2F${provider.slug}`),
    );
    await visitorContext.close();

    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto("/de/studio/nachrichten");
    await expect(
      studio.getByRole("heading", { level: 1, name: "Nachrichten" }),
    ).toBeVisible();
    await expect(studio.getByText("Noch keine Nachrichten")).toBeVisible();

    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/p/${provider.slug}`);
    await page
      .locator("[data-contact-bar=panel]")
      .getByRole("button", { name: "Nachricht schreiben" })
      .click();
    await expect(page).toHaveURL(/\/de\/nachrichten\/[^/?]+$/);
    await expect(
      page.getByRole("heading", { level: 2, name: provider.displayName }),
    ).toBeVisible();
    await expect(
      page.getByText(
        `Schreib ${provider.displayName} unten die erste Nachricht.`,
      ),
    ).toBeVisible();
    const conversationId = page.url().split("/").pop() ?? "";

    await page
      .getByRole("textbox", { name: `Nachricht an ${provider.displayName}` })
      .fill("Guten Tag, ist am Donnerstag etwas frei?");
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    const own = threadLog(page)
      .getByRole("listitem")
      .filter({ hasText: "Guten Tag, ist am Donnerstag" });
    await expect(own).toContainText("Gesendet");
    await expect(own).not.toContainText("Gelesen");
    await expectNoSeriousAxeFindings(page);

    // Ankunft im Studio über den Echtzeit-Dienst, schneller als die Nachfrage alle 20 Sekunden.
    const row = inboxRow(studio, "Mitglied seit");
    await expect(row).toContainText(
      "Guten Tag, ist am Donnerstag etwas frei?",
      { timeout: 10_000 },
    );
    await expect(row.getByRole("link")).toContainText("1 ungelesene Nachricht");
    await expectNoSeriousAxeFindings(studio);

    await row.getByRole("link").click();
    await expect(studio).toHaveURL(
      new RegExp(`/de/studio/nachrichten/${conversationId}$`),
    );
    await expect(threadLog(studio)).toContainText(
      "Guten Tag, ist am Donnerstag etwas frei?",
    );
    await expect(
      inboxRow(studio, "Mitglied seit").getByRole("link"),
    ).not.toContainText("ungelesen");
    await expect(
      studio.getByRole("complementary", { name: "Details zur Unterhaltung" }),
    ).toContainText(`Mitglied seit ${new Date().getFullYear()}`);
    await expectNoSeriousAxeFindings(studio);

    // Antwort kommt beim Mitglied ohne Neuladen an und wird angesagt.
    await studio
      .getByRole("textbox", { name: /^Nachricht an Mitglied seit/ })
      .fill("Ja, ab 18 Uhr.");
    await studio
      .getByRole("textbox", { name: /^Nachricht an Mitglied seit/ })
      .press("Enter");
    await expect(threadLog(page)).toContainText("Ja, ab 18 Uhr.", {
      timeout: 10_000,
    });
    await expect(page.locator("[data-announcement]")).toHaveText(
      `Neue Nachricht von ${provider.displayName}: Ja, ab 18 Uhr.`,
    );
    // Ohne Lesebestätigungen bleibt es bei «Gesendet».
    await expect(own).toContainText("Gesendet");
    expect(await messageCount(conversationId)).toBe(2);

    // «Nachricht schreiben» öffnet die bestehende Unterhaltung.
    await page.goto(`/de/p/${provider.slug}`);
    await page
      .locator("[data-contact-bar=panel]")
      .getByRole("button", { name: "Nachricht schreiben" })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/de/nachrichten/${conversationId}$`),
    );
  });

  test("«Gelesen» erscheint nur, wenn beide Seiten Lesebestätigungen erlauben", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    await setReadReceipts(member.id, true);
    await setReadReceipts(provider.id, true);
    const conversationId = await createConversation(member, provider);
    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/nachrichten/${conversationId}`);
    await page
      .getByRole("textbox", { name: `Nachricht an ${provider.displayName}` })
      .fill("Bitte kurz bestätigen.");
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    const own = threadLog(page)
      .getByRole("listitem")
      .filter({ hasText: "Bitte kurz bestätigen." });
    await expect(own).toContainText("Gesendet");

    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto(`/de/studio/nachrichten/${conversationId}`);
    await expect(threadLog(studio)).toContainText("Bitte kurz bestätigen.");
    await expect(own).toContainText("Gelesen", { timeout: 10_000 });

    // Schaltet eine Seite ab, zeigt der Verlauf wieder nur «Gesendet».
    await setReadReceipts(provider.id, false);
    await page.reload();
    await expect(
      threadLog(page)
        .getByRole("listitem")
        .filter({ hasText: "Bitte kurz bestätigen." }),
    ).toContainText("Gesendet");
    await expect(threadLog(page)).not.toContainText("Gelesen");
  });

  test("Fehlgeschlagen und «Erneut senden» ergeben genau eine Nachricht", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const conversationId = await createConversation(member, provider);
    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/nachrichten/${conversationId}`);
    const field = page.getByRole("textbox", {
      name: `Nachricht an ${provider.displayName}`,
    });
    const sending =
      (text: string) =>
      (request: {
        method(): string;
        headers(): Record<string, string>;
        postData(): string | null;
      }) =>
        request.method() === "POST" &&
        request.headers()["next-action"] !== undefined &&
        (request.postData() ?? "").includes(text);

    // 1. Die Anfrage erreicht den Server nicht: «Fehlgeschlagen», dann «Erneut senden».
    let blocked = false;
    await page.route(`**/de/nachrichten/${conversationId}`, async (route) => {
      if (!blocked && sending("Verbindung wackelt")(route.request())) {
        blocked = true;
        await route.abort("internetdisconnected");
        return;
      }
      await route.fallback();
    });
    await field.fill("Verbindung wackelt, kommt das an?");
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    const own = threadLog(page)
      .getByRole("listitem")
      .filter({ hasText: "Verbindung wackelt" });
    await expect(own).toContainText("Fehlgeschlagen");
    await expect(own).toContainText(
      "Keine Verbindung zum Server. Deine Nachricht ist nicht verloren.",
    );
    expect(await messageCount(conversationId)).toBe(0);
    await own.getByRole("button", { name: "Erneut senden" }).click();
    await expect(own).toContainText("Gesendet");
    expect(await messageCount(conversationId)).toBe(1);

    // 2. Der Server speichert, die Antwort geht verloren: Wie es auch ausgeht, es bleibt eine Nachricht.
    let lost = false;
    await page.route(`**/de/nachrichten/${conversationId}`, async (route) => {
      if (!lost && sending("Antwort geht verloren")(route.request())) {
        lost = true;
        await route.fetch();
        await route.abort("connectionreset");
        return;
      }
      await route.fallback();
    });
    await field.fill("Antwort geht verloren, trotzdem nur einmal.");
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    await expect.poll(() => messageCount(conversationId)).toBe(2);
    const second = threadLog(page)
      .getByRole("listitem")
      .filter({ hasText: "Antwort geht verloren" });
    const retry = second.getByRole("button", { name: "Erneut senden" });
    if (await retry.isVisible()) await retry.click();
    await expect(second).toHaveCount(1);
    await expect(second).toContainText("Gesendet");
    await page.reload();
    await expect(
      threadLog(page)
        .getByRole("listitem")
        .filter({ hasText: "Verbindung wackelt" }),
    ).toHaveCount(1);
    await expect(
      threadLog(page)
        .getByRole("listitem")
        .filter({ hasText: "Antwort geht verloren" }),
    ).toHaveCount(1);
    expect(await messageCount(conversationId)).toBe(2);
  });

  test("eigene Nachricht löschen: Rückfrage nennt die Folge, danach «Nachricht gelöscht» auf beiden Seiten", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const conversationId = await createConversation(member, provider, [
      {
        from: "provider",
        body: "Willkommen, schreib mir gern.",
        minutesAgo: 30,
      },
      {
        from: "member",
        body: "Diese Nachricht nehme ich zurück.",
        minutesAgo: 20,
      },
    ]);
    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/nachrichten/${conversationId}`);
    const own = threadLog(page)
      .getByRole("listitem")
      .filter({ hasText: "Diese Nachricht nehme ich zurück." });
    await own.getByRole("button", { name: "Aktionen zur Nachricht" }).click();
    await page.getByRole("menuitem", { name: "Nachricht löschen" }).click();
    const dialog = page.getByRole("alertdialog", {
      name: "Nachricht löschen?",
    });
    await expect(dialog).toContainText(
      `für dich und für ${provider.displayName}`,
    );
    await expect(dialog).toContainText("nicht rückgängig");
    await dialog.getByRole("button", { name: "Nachricht löschen" }).click();
    await expect(dialog).toBeHidden();
    await expect(threadLog(page)).toContainText("Nachricht gelöscht");
    await expect(threadLog(page)).not.toContainText(
      "Diese Nachricht nehme ich zurück.",
    );
    // Fremde Nachrichten lassen sich nur melden, nicht löschen.
    await threadLog(page)
      .getByRole("listitem")
      .filter({ hasText: "Willkommen" })
      .getByRole("button", { name: "Aktionen zur Nachricht" })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Nachricht melden" }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Nachricht löschen" }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");

    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto(`/de/studio/nachrichten/${conversationId}`);
    await expect(threadLog(studio)).toContainText("Nachricht gelöscht");
    await expect(threadLog(studio)).not.toContainText("nehme ich zurück");
    const [row] = await query<{ body: string | null }>(
      `select body from message where "conversationId" = $1 and "deletedAt" is not null`,
      [conversationId],
    );
    expect(row?.body).toBeNull();
  });

  test("ältere Nachrichten nachladen: die Stelle bleibt, nichts doppelt", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const messages = Array.from({ length: 56 }, (_, index) => ({
      from: index % 2 === 0 ? ("provider" as const) : ("member" as const),
      body: `Verlaufsnachricht ${String(index + 1).padStart(2, "0")}`,
      minutesAgo: 200 - index,
    }));
    const conversationId = await createConversation(member, provider, messages);
    const page = await signedInPage(browser, member, baseURL);
    await page.goto(`/de/nachrichten/${conversationId}`);
    await expect(threadLog(page)).toContainText("Verlaufsnachricht 56");
    await expect(threadLog(page)).not.toContainText("Verlaufsnachricht 01");
    await page
      .getByRole("button", { name: "Ältere Nachrichten laden" })
      .click();
    await expect(threadLog(page)).toContainText("Verlaufsnachricht 01");
    await expect(
      page.getByRole("button", { name: "Ältere Nachrichten laden" }),
    ).toHaveCount(0);
    await expect(
      threadLog(page)
        .getByRole("listitem")
        .filter({ hasText: /^Verlaufsnachricht|Verlaufsnachricht \d\d/ }),
    ).toHaveCount(56);
  });
});
