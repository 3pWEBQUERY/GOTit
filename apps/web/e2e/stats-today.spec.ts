import { cleanup, query } from "./admin-fixtures";
import {
  createBookableProvider,
  createRequest,
  zurichDay,
  zurichTime,
} from "./booking-fixtures";
import {
  createMember,
  createProvider,
  signedInPage,
} from "./messages-fixtures";
import { insertEvents, publishedMedia } from "./stats-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Studio «Heute» für Anbieter (PRD v2 11.1, Entscheid 0019): «Zu erledigen»
 * nach Dringlichkeit, die heutigen Kalendereinträge, Kennzahlen mit Vergleich
 * und «Dein Profil».
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));
test.use({ viewport: { width: 1280, height: 900 } });

test.describe("Studio Heute", () => {
  test("«Zu erledigen» nach Dringlichkeit: Verifizierung, Anfragen, Nachrichten, Korrekturen; heute im Kalender", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookableProvider(created);
    const member = await createMember(created);
    const other = await createMember(created);
    await query(
      `update identity_check set "expiresAt" = now() + interval '10 days' where "userId" = $1`,
      [provider.id],
    );
    // Eine offene Anfrage für übermorgen (mit ungelesener Nachricht) und ein bestätigter Termin heute Abend.
    const open = await createRequest(
      member,
      provider,
      zurichTime(zurichDay(2).day, "18:00"),
    );
    const confirmed = await createRequest(
      other,
      provider,
      zurichTime(zurichDay(0).day, "23:00"),
    );
    await query(
      `update booking_request set status = 'CONFIRMED' where id = $1`,
      [confirmed.requestId],
    );
    await publishedMedia(
      provider.profileId,
      provider.id,
      "Fiktives Foto zur Korrektur",
      "CHANGES_REQUESTED",
    );

    const page = await signedInPage(browser, provider, baseURL);
    await page.goto("/de/studio");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /^Heute, \S+ \d{1,2}\. \S+$/,
    );
    const todo = page.getByRole("region", { name: "Zu erledigen" });
    await expect(todo.locator("[data-todo]")).toHaveCount(4);
    expect(
      await todo
        .locator("[data-todo]")
        .evaluateAll((items) =>
          items.map((item) => item.getAttribute("data-todo")),
        ),
    ).toEqual(["verification", "requests", "messages", "media"]);
    await expect(todo.locator('[data-todo="verification"]')).toContainText(
      "Verifizierung läuft in 10 Tagen ab",
    );
    await expect(todo.locator('[data-todo="requests"]')).toContainText(
      "1 Terminanfrage wartet auf Antwort",
    );
    await expect(
      todo
        .locator('[data-todo="requests"]')
        .getByRole("link", { name: /^Anfrage für / }),
    ).toHaveAttribute("href", `/de/studio/anfragen/${open.requestId}`);
    await expect(todo.locator('[data-todo="messages"]')).toContainText(
      "2 ungelesene Nachrichten",
    );
    await expect(todo.locator('[data-todo="media"]')).toContainText(
      "1 Foto zur Korrektur zurückgegeben",
    );

    const today = page.getByRole("region", { name: "Heute", exact: true });
    const booking = today.getByRole("link", {
      name: /23:00–24:00 Termin, Bestätigt/,
    });
    await expect(booking).toHaveAttribute(
      "href",
      `/de/studio/anfragen/${confirmed.requestId}`,
    );
    await expect(
      today.getByRole("link", { name: "Kalender öffnen" }),
    ).toHaveAttribute("href", "/de/studio/kalender");
    await expectNoSeriousAxeFindings(page);
  });
});

test.describe("Studio Heute: Kennzahlen und Profil", () => {
  test("ohne Offenes steht «Nichts offen»; Kennzahlen mit Zeitraum in der URL; Vollständigkeit nennt, was fehlt", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    await insertEvents(provider.profileId, [
      { kind: "PROFILE_VIEW", day: -1, count: 4 },
      { kind: "PROFILE_VIEW", day: -20, count: 2 },
      { kind: "CONTACT_ACTION", day: -2, count: 1 },
    ]);
    const page = await signedInPage(browser, provider, baseURL);
    await page.goto("/de/studio");
    const todo = page.getByRole("region", { name: "Zu erledigen" });
    await expect(todo).toContainText("Nichts offen");
    await expect(todo.locator("[data-todo]")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Heute", exact: true }),
    ).toContainText("Heute steht nichts im Kalender.");

    const stats = page.locator("[data-today-stats]");
    await expect(stats.getByRole("heading", { level: 2 })).toHaveText(
      "Letzte 7 Tage",
    );
    await expect(stats.locator('[data-kpi="profileViews"]')).toContainText(
      "4 mehr als in den 7 Tagen davor",
    );
    await expect(stats.locator('[data-kpi="contactActions"]')).toContainText(
      "1 mehr als in den 7 Tagen davor",
    );
    await expect(stats.locator("[data-kpi]")).toHaveCount(4);
    await expect(
      stats.getByRole("link", { name: "Zur Statistik" }),
    ).toHaveAttribute("href", "/de/studio/statistik");

    await stats.getByRole("link", { name: "30 Tage" }).click();
    await expect(page).toHaveURL(/\/de\/studio\?zeitraum=30$/);
    await expect(stats.getByRole("heading", { level: 2 })).toHaveText(
      "Letzte 30 Tage",
    );
    await expect(stats.getByRole("link", { name: "30 Tage" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(stats.locator('[data-kpi="profileViews"]')).toContainText(
      "6 mehr als in den 30 Tagen davor",
    );
    await expect(
      stats.getByRole("link", { name: "Zur Statistik" }),
    ).toHaveAttribute("href", "/de/studio/statistik?zeitraum=30");

    const profile = page.locator("[data-today-profile]");
    await expect(profile).toContainText(
      /Vollständig zu \d+\s?%: Beschreibung ist kurz/,
    );
    await expect(
      profile.getByRole("link", { name: "Beschreibung ergänzen" }),
    ).toHaveAttribute("href", "/de/studio/profil/beschreibung");
    await expect(
      profile.getByRole("link", { name: "Im Marktplatz ansehen" }),
    ).toHaveAttribute("href", `/de/p/${provider.slug}`);
  });

  test("bei 375 px untereinander, ohne horizontales Scrollen", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const page = await signedInPage(browser, provider, baseURL, {
      viewport: { width: 375, height: 812 },
    });
    await page.goto("/de/studio");
    await expect(
      page.getByRole("region", { name: "Zu erledigen" }),
    ).toContainText("Nichts offen");
    await expect(page.locator("[data-today-stats]")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);
  });
});
