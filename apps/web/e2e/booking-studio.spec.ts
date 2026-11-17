import { cleanup, query } from "./admin-fixtures";
import {
  createBookingProvider,
  createRequest,
  dayIn,
  openCalendar,
  requestRow,
  setUsername,
} from "./booking-studio-fixtures";
import { createMember, signedInPage } from "./messages-fixtures";
import {
  expectNoSeriousAxeFindings,
  expectNoHorizontalScroll,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Studio, Kalender und Terminanfragen (v2 11.5, v1 FR-BOOKING-001/003/004,
 * Abnahme 20.5, Entscheid 0016): Einträge nach Legende mit Status als Wort,
 * Seitenpanel mit Aktionen, Doppelbuchungsschutz, Gegenvorschlag, Ablehnen
 * und Absagen nach Rückfrage, private Notiz, Tabs, 404 und Mobile.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));
test.use({ viewport: { width: 1280, height: 900 } });

const HOUR = 60;

test.describe("Studio: Kalender", () => {
  test("Woche zeigt verfügbar, Anfrage, bestätigt und Blocker mit Status als Wort; Panel öffnet die Anfrage und nimmt sie an", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookingProvider(created);
    const member = await createMember(created);
    await setUsername(member, `gast_${Date.now()}`.slice(0, 20));
    const day = dayIn(8);
    const open = await createRequest(member, provider, {
      day,
      startMinute: 18 * HOUR,
    });
    await createRequest(member, provider, {
      day,
      startMinute: 14 * HOUR,
      status: "CONFIRMED",
    });
    await query(
      `insert into calendar_block (id, "providerProfileId", kind, "startsAt", "endsAt", note) values ($1, $2, 'BLOCKER', (($3::date + interval '20 hours')::timestamp at time zone 'Europe/Zurich') at time zone 'UTC', (($3::date + interval '21 hours')::timestamp at time zone 'Europe/Zurich') at time zone 'UTC', null)`,
      [`e2e_block_${Date.now()}`, provider.profileId, day],
    );
    const page = await signedInPage(browser, provider, baseURL);
    await openCalendar(page, "woche", day);

    const calendar = page.locator("[data-calendar]");
    await expect(
      calendar.getByRole("table", { name: /^Kalender, / }),
    ).toBeVisible();
    const grid = calendar.getByRole("table");
    await expect(grid.locator("[data-kind=available]").first()).toContainText(
      "Verfügbar",
    );
    await expect(grid.locator("[data-kind=request]")).toContainText(
      "Angefragt",
    );
    await expect(grid.locator("[data-kind=confirmed]")).toContainText(
      "Bestätigt",
    );
    await expect(grid.locator("[data-kind=blocker]")).toContainText(
      "Blockiert",
    );
    await expect(page.getByRole("list", { name: "Legende" })).toContainText(
      "Blocker oder Abwesenheit",
    );
    await expectNoSeriousAxeFindings(page);

    await calendar
      .getByRole("button", { name: /18:00–19:00.*Angefragt/ })
      .click();
    await expect(page).toHaveURL(new RegExp(`anfrage=${open.id}`));
    const panel = page.getByRole("dialog", {
      name: /^Terminanfrage von gast_/,
    });
    await expect(
      panel.getByRole("link", { name: "Unterhaltung öffnen" }),
    ).toHaveAttribute("href", `/de/studio/nachrichten/${open.conversationId}`);
    await expect(
      panel.getByRole("list", { name: "Verlauf der Terminanfrage" }),
    ).toContainText("Mitglied");
    await expectNoSeriousAxeFindings(page);
    await panel.getByRole("button", { name: "Anfrage annehmen" }).click();
    await expect(
      page.getByText("Termin bestätigt", { exact: true }),
    ).toBeVisible();
    await expect(panel.locator("[data-request-detail]")).toHaveAttribute(
      "data-status",
      "CONFIRMED",
    );
    expect((await requestRow(open.id))?.status).toBe("CONFIRMED");

    // Escape schliesst zuerst den Toast (oberste Ebene); der Schliessen-Button schliesst das Panel.
    await panel.getByRole("button", { name: "Schliessen" }).click();
    await expect(panel).toBeHidden();
    await expect(page).not.toHaveURL(/anfrage=/);
    await expect(grid.locator("[data-kind=confirmed]")).toHaveCount(2);

    await calendar.getByRole("radio", { name: "Monat" }).click();
    await expect(page).toHaveURL(/ansicht=monat/);
    await expect(calendar.getByRole("grid")).toBeVisible();
    await expect(
      calendar.getByRole("button", { name: /2 bestätigt/ }),
    ).toBeVisible();
    await expectNoSeriousAxeFindings(page);
  });

  test("Exklusivbelegung: eine überschneidende zweite Anfrage lässt sich nicht annehmen", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookingProvider(created);
    const member = await createMember(created);
    const day = dayIn(10);
    await createRequest(member, provider, {
      day,
      startMinute: 16 * HOUR,
      minutes: 120,
      status: "CONFIRMED",
    });
    const second = await createRequest(member, provider, {
      day,
      startMinute: 17 * HOUR,
    });
    const page = await signedInPage(browser, provider, baseURL);
    await page.goto(`/de/studio/anfragen/${second.id}`);
    await page.getByRole("button", { name: "Anfrage annehmen" }).click();
    const alert = page.locator("[data-request-actions]").getByRole("alert");
    await expect(alert).toContainText("Zeit schon belegt");
    await expect(alert).toContainText(
      "Mit Exklusivbelegung ist das nicht möglich.",
    );
    expect((await requestRow(second.id))?.status).toBe("REQUESTED");
  });
});

test.describe("Studio: Terminanfragen", () => {
  test("Gegenvorschlag, Ablehnen und Absagen mit Rückfrage; alles im Verlauf", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookingProvider(created);
    const member = await createMember(created);
    const counter = await createRequest(member, provider, {
      day: dayIn(11),
      startMinute: 18 * HOUR,
    });
    const decline = await createRequest(member, provider, {
      day: dayIn(12),
      startMinute: 18 * HOUR,
    });
    const confirmed = await createRequest(member, provider, {
      day: dayIn(13),
      startMinute: 18 * HOUR,
      status: "CONFIRMED",
    });
    const page = await signedInPage(browser, provider, baseURL);

    await page.goto(`/de/studio/anfragen/${counter.id}`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Terminanfrage von Mitglied",
      }),
    ).toBeVisible();
    await expectNoSeriousAxeFindings(page);
    await page.getByRole("button", { name: "Gegenvorschlag machen" }).click();
    const form = page.locator("[data-counter-form]");
    await form.getByRole("textbox", { name: "Beginn" }).fill("23:00");
    await form.getByRole("combobox", { name: "Dauer" }).click();
    await page.getByRole("option", { name: "1 Std. 30 Min." }).click();
    await form.getByRole("button", { name: "Gegenvorschlag senden" }).click();
    await expect(
      page.getByText("Gegenvorschlag gesendet", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-request-detail]")).toHaveAttribute(
      "data-status",
      "NEGOTIATING",
    );
    await expect(
      page.getByText("Dein Vorschlag.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Anfrage annehmen" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("list", { name: "Verlauf der Terminanfrage" }),
    ).toContainText("Gegenvorschlag");
    const row = await requestRow(counter.id);
    expect(row).toMatchObject({
      status: "NEGOTIATING",
      lastProposedBy: "PROVIDER",
      start: `${dayIn(11)} 23:00`,
    });

    await page.goto(`/de/studio/anfragen/${decline.id}`);
    await page.getByRole("button", { name: "Anfrage ablehnen" }).click();
    const step = page.locator("[data-confirm-step=decline]");
    await expect(
      step.getByRole("heading", { name: "Diese Terminanfrage ablehnen?" }),
    ).toBeFocused();
    await expect(step).toContainText("Das lässt sich nicht rückgängig machen.");
    await step.getByRole("button", { name: "Abbrechen" }).click();
    expect((await requestRow(decline.id))?.status).toBe("REQUESTED");
    await page.getByRole("button", { name: "Anfrage ablehnen" }).click();
    await step.getByRole("textbox", { name: /Grund/ }).fill("Fiktiver Grund");
    await step.getByRole("button", { name: "Anfrage ablehnen" }).click();
    await expect(
      page.getByText("Anfrage abgelehnt", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-request-detail]")).toHaveAttribute(
      "data-status",
      "DECLINED",
    );
    await expect(
      page.getByRole("list", { name: "Verlauf der Terminanfrage" }),
    ).toContainText("Grund: Fiktiver Grund");
    await expect(
      page.getByText("Für diese Terminanfrage gibt es nichts mehr zu tun."),
    ).toBeVisible();

    await page.goto(`/de/studio/anfragen/${confirmed.id}`);
    await page
      .getByRole("button", { name: "Aus Sicherheitsgründen absagen" })
      .click();
    const safety = page.locator("[data-confirm-step=cancel-safety]");
    await expect(safety).toContainText("Danach kannst du das Mitglied melden.");
    await safety
      .getByRole("button", { name: "Aus Sicherheitsgründen absagen" })
      .click();
    await expect(page.locator("[data-request-detail]")).toHaveAttribute(
      "data-status",
      "CANCELLED",
    );
    await page.getByRole("button", { name: "Mitglied melden" }).click();
    await expect(page.getByRole("dialog", { name: /melden/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("list", { name: "Verlauf der Terminanfrage" }),
    ).toContainText("Aus Sicherheitsgründen.");
  });

  test("Absagen eines bestätigten Termins nach Rückfrage", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookingProvider(created);
    const member = await createMember(created);
    const confirmed = await createRequest(member, provider, {
      day: dayIn(14),
      startMinute: 12 * HOUR,
      status: "CONFIRMED",
    });
    const page = await signedInPage(browser, provider, baseURL);
    await page.goto(`/de/studio/anfragen/${confirmed.id}`);
    await page.getByRole("button", { name: "Termin absagen" }).click();
    const step = page.locator("[data-confirm-step=cancel]");
    await expect(step).toContainText("die Zeit wird wieder frei");
    await step.getByRole("button", { name: "Termin absagen" }).click();
    await expect(
      page.getByText("Termin abgesagt", { exact: true }),
    ).toBeVisible();
    expect((await requestRow(confirmed.id))?.status).toBe("CANCELLED");
  });

  test("private Notiz bleibt beim Anbieter; das Mitglied sieht sie nicht", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookingProvider(created);
    const member = await createMember(created);
    const request = await createRequest(member, provider, {
      day: dayIn(15),
      startMinute: 18 * HOUR,
    });
    const page = await signedInPage(browser, provider, baseURL);
    await page.goto(`/de/studio/anfragen/${request.id}`);
    const note = page.locator("[data-provider-note]");
    await note
      .getByRole("textbox", { name: /Private Notiz/ })
      .fill("Geheime Notiz Fiktiv 4711");
    await note.getByRole("button", { name: "Notiz speichern" }).click();
    await expect(note.getByRole("status")).toHaveText("Notiz gespeichert");
    await page.reload();
    await expect(page.locator("[data-provider-note] textarea")).toHaveValue(
      "Geheime Notiz Fiktiv 4711",
    );
    expect((await requestRow(request.id))?.providerNote).toBe(
      "Geheime Notiz Fiktiv 4711",
    );

    const memberPage = await signedInPage(browser, member, baseURL);
    const response = await memberPage.goto(`/de/termine/${request.id}`);
    expect(response?.status()).toBe(200);
    expect(await memberPage.content()).not.toContain(
      "Geheime Notiz Fiktiv 4711",
    );
    await memberPage.goto(`/de/studio/anfragen/${request.id}`);
    await expect(memberPage).not.toHaveURL(/studio\/anfragen/);
  });

  test("Tabs in der URL, Ablaufzeit bei offenen Anfragen, 404 für fremde und unbekannte IDs", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookingProvider(created);
    const other = await createBookingProvider(created);
    const member = await createMember(created);
    const open = await createRequest(member, provider, {
      day: dayIn(16),
      startMinute: 18 * HOUR,
    });
    const agreed = await createRequest(member, provider, {
      day: dayIn(17),
      startMinute: 18 * HOUR,
      status: "CONFIRMED",
    });
    const foreign = await createRequest(member, other, {
      day: dayIn(16),
      startMinute: 18 * HOUR,
    });
    const page = await signedInPage(browser, provider, baseURL);

    await page.goto("/de/studio/anfragen");
    await expect(page.getByRole("link", { name: "Offen" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const rows = page.locator("[data-request-row]");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute("data-request-row", open.id);
    await expect(rows.first()).toContainText("Antwort bis");
    await expect(rows.first()).toContainText("Angefragt");
    await expectNoSeriousAxeFindings(page);

    await page.getByRole("link", { name: "Bestätigt" }).click();
    await expect(page).toHaveURL(/status=bestaetigt/);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute("data-request-row", agreed.id);
    await expect(rows.first()).not.toContainText("Antwort bis");
    await page.getByRole("link", { name: "In Abstimmung" }).click();
    await expect(
      page.getByText(
        "Hier erscheinen Anfragen, zu denen es einen Gegenvorschlag gibt.",
      ),
    ).toBeVisible();

    await page.goto("/de/studio/anfragen?status=bestaetigt");
    await rows.first().getByRole("link").click();
    await expect(page).toHaveURL(
      new RegExp(`/de/studio/anfragen/${agreed.id}$`),
    );

    expect(
      (await page.goto(`/de/studio/anfragen/${foreign.id}`))?.status(),
    ).toBe(404);
    expect(
      (await page.goto("/de/studio/anfragen/gibt-es-nicht"))?.status(),
    ).toBe(404);
  });
});

test.describe("Studio: Kalender auf Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("zeigt standardmässig den Tag mit Wochenstreifen, ohne seitliches Scrollen", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookingProvider(created);
    const member = await createMember(created);
    const day = dayIn(1);
    await createRequest(member, provider, { day, startMinute: 18 * HOUR });
    const page = await signedInPage(browser, provider, baseURL, {
      viewport: { width: 375, height: 812 },
    });
    await page.goto(`/de/studio/kalender?datum=${day}`);
    const mobile = page.locator("[data-calendar-mobile]");
    await expect(
      mobile.getByRole("group", { name: "Tag der Woche wählen" }),
    ).toBeVisible();
    await expect(page.locator("[data-calendar-desktop]")).toBeHidden();
    await expect(
      mobile.getByRole("button", { name: /18:00–19:00.*Angefragt/ }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);

    await page.goto("/de/studio/anfragen");
    await expectNoHorizontalScroll(page);
    await page.goto("/de/studio/kalender/verfuegbarkeit");
    await expectNoHorizontalScroll(page);
  });
});
