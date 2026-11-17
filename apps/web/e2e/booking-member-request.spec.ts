import { cleanup, query } from "./admin-fixtures";
import {
  bookingCard,
  choose,
  createBookableProvider,
  dayLabel,
  zurichDay,
} from "./booking-fixtures";
import { createMember, signedInPage } from "./messages-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { PASSWORD } from "./admin-fixtures";
import { confirmAge } from "./support/session";
import { expect, test } from "./support/test";

/**
 * Terminanfrage vom Profil aus (v2 10.1, 10.2, 8.2; Entscheid 0016):
 * Besucher füllen das Formular, melden sich erst beim Senden an und kommen
 * mit ihren Eingaben zurück; nur freie Tage und Zeiten sind wählbar; danach
 * steht die Anfrage unter «Termine» und als Karte in beiden Verläufen.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

test.describe("Terminanfrage: Formular", () => {
  test("Besucher füllt aus, meldet sich an, kommt mit den Eingaben zurück und sendet; beide Seiten sehen die Karte", async ({
    browser,
    baseURL,
  }) => {
    const free = zurichDay(1);
    const closed = zurichDay(2);
    const provider = await createBookableProvider(created, {
      closedWeekday: closed.weekday,
    });
    const member = await createMember(created);

    const context = await browser.newContext();
    const page = await context.newPage();
    await confirmAge(page, `/de/p/${provider.slug}`);
    await page
      .locator("[data-contact-bar=panel]")
      .getByRole("link", { name: "Termin anfragen" })
      .click();
    await expect(page).toHaveURL(new RegExp(`/de/p/${provider.slug}/anfrage$`));
    const panel = page.getByRole("dialog", {
      name: `Termin anfragen bei ${provider.displayName}`,
    });
    await expect(panel).toContainText(
      `Unverbindlich. ${provider.displayName} entscheidet frei`,
    );

    // Fehler am Feld, der Senden-Button ist nie gesperrt.
    await panel.getByRole("button", { name: "Anfrage senden" }).click();
    await expect(panel.getByText("Wähl einen Tag.").first()).toBeVisible();
    await expect(panel.getByRole("combobox", { name: "Tag" })).toBeFocused();

    // Nur Tage mit freien Zeiten: der geschlossene Wochentag fehlt.
    await panel.getByRole("combobox", { name: "Tag" }).click();
    await expect(
      page.getByRole("option", { name: dayLabel(free.day) }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: dayLabel(closed.day) }),
    ).toHaveCount(0);
    await page.getByRole("option", { name: dayLabel(free.day) }).click();
    await panel.getByRole("combobox", { name: "Uhrzeit" }).click();
    await expect(page.getByRole("option", { name: "09:30" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "21:30" })).toBeVisible();
    await expect(page.getByRole("option", { name: "22:00" })).toHaveCount(0);
    await page.getByRole("option", { name: "21:00" }).click();
    // Um 21:00 passt höchstens eine Stunde bis zum Ende des Fensters.
    await panel.getByRole("combobox", { name: "Dauer" }).click();
    await expect(
      page.getByRole("option", { name: "1 Std.", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "2 Std." })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await choose(page, "Uhrzeit", "18:00");
    await choose(page, "Dauer", "1 Std. 30 Min.");
    await choose(page, "Region", "Zürich");
    await panel
      .getByRole("textbox", { name: /Nachricht/ })
      .fill("Fiktive Anfrage aus dem Test, bitte nicht beachten.");
    await expectNoSeriousAxeFindings(page);
    await panel.getByRole("button", { name: "Anfrage senden" }).click();

    // Anmeldung: Tag, Zeit, Dauer, Region in der URL, die Nachricht nicht.
    await expect(page).toHaveURL(/\/de\/anmelden\?weiter=/);
    expect(decodeURIComponent(decodeURIComponent(page.url()))).toContain(
      `/de/p/${provider.slug}/anfrage?tag=${free.day}&zeit=18:00&dauer=90&region=`,
    );
    expect(page.url()).not.toContain("Fiktive");
    await page.getByLabel("E-Mail-Adresse").fill(member.email);
    await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Mit E-Mail anmelden" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/de/p/${provider.slug}/anfrage\\?`),
    );
    const back = page.getByRole("dialog", {
      name: `Termin anfragen bei ${provider.displayName}`,
    });
    await expect(back.getByRole("combobox", { name: "Tag" })).toContainText(
      dayLabel(free.day),
    );
    await expect(back.getByRole("combobox", { name: "Uhrzeit" })).toContainText(
      "18:00",
    );
    await expect(back.getByRole("combobox", { name: "Dauer" })).toContainText(
      "1 Std. 30 Min.",
    );
    await expect(back.getByRole("combobox", { name: /Region/ })).toContainText(
      "Zürich",
    );
    await expect(back.getByRole("textbox", { name: /Nachricht/ })).toHaveValue(
      "Fiktive Anfrage aus dem Test, bitte nicht beachten.",
    );
    await back.getByRole("button", { name: "Anfrage senden" }).click();
    await expect(back.getByText("Anfrage gesendet")).toBeVisible();

    const [row] = await query<{
      id: string;
      conversationId: string;
      status: string;
    }>(
      `select id, "conversationId", status::text as status from booking_request where "memberUserId" = $1`,
      [member.id],
    );
    expect(row?.status).toBe("REQUESTED");
    await expect(
      back.getByRole("link", { name: "Anfrage ansehen" }),
    ).toHaveAttribute("href", `/de/termine/${row?.id}`);
    await expect(
      back.getByRole("link", { name: "Unterhaltung öffnen" }),
    ).toHaveAttribute("href", `/de/nachrichten/${row?.conversationId}`);

    // «Termine»: Offen, mit Zeit in der Zone des Anbieters und Status als Wort.
    await page.goto("/de/termine");
    const list = page.locator("[data-booking-list=offen]");
    await expect(list).toContainText(provider.displayName);
    await expect(list).toContainText(`${dayLabel(free.day)}, 18:00–19:30`);
    await expect(list).toContainText("Angefragt");
    await expect(list).toContainText("Läuft ab:");

    // Karte im Verlauf beider Seiten (v2 11.4).
    await page.goto(`/de/nachrichten/${row?.conversationId}`);
    const own = bookingCard(page, row?.id ?? "");
    await expect(own).toContainText(`Terminanfrage an ${provider.displayName}`);
    await expect(own).toContainText("Angefragt");
    await expect(
      own.getByRole("link", { name: "Anfrage ansehen" }),
    ).toHaveAttribute("href", `/de/termine/${row?.id}`);
    await expect(
      own.getByRole("button", { name: "Anfrage annehmen" }),
    ).toHaveCount(0);
    const studio = await signedInPage(browser, provider, baseURL);
    await studio.goto(`/de/studio/nachrichten/${row?.conversationId}`);
    const theirs = bookingCard(studio, row?.id ?? "");
    await expect(theirs).toContainText("Terminanfrage von");
    await expect(theirs).toContainText("Zürich");
    await expect(
      theirs.getByRole("button", { name: "Anfrage annehmen" }),
    ).toBeVisible();
    await expect(
      theirs.getByRole("link", { name: "Anfrage ansehen" }),
    ).toHaveAttribute("href", `/de/studio/anfragen/${row?.id}`);
    await context.close();
  });

  test("ohne eingetragene Zeiten: ehrlicher Leerzustand mit «Nachricht schreiben»; 375 px ohne seitliches Scrollen", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookableProvider(created, { windows: false });
    const member = await createMember(created);
    const page = await signedInPage(browser, member, baseURL, {
      viewport: { width: 375, height: 800 },
    });
    await page.goto(`/de/p/${provider.slug}/anfrage`);
    const sheet = page.getByRole("dialog", {
      name: `Termin anfragen bei ${provider.displayName}`,
    });
    await expect(sheet).toHaveAttribute("data-booking-panel", "sheet");
    await expect(
      sheet.getByText("Noch keine freien Zeiten eingetragen"),
    ).toBeVisible();
    await expect(
      sheet.getByRole("button", { name: "Nachricht schreiben" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeFindings(page);
  });

  test("Inhaber sieht kein «Termin anfragen»; das Panel führt ihn zurück zum Profil", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookableProvider(created);
    const page = await signedInPage(browser, provider, baseURL);
    await page.goto(`/de/p/${provider.slug}`);
    await expect(
      page
        .locator("[data-contact-bar=panel]")
        .getByRole("link", { name: "Termin anfragen" }),
    ).toHaveCount(0);
    await expect(page.locator("[data-contact-bar=panel]")).toContainText(
      "unverbindlich einen Termin anfragen",
    );
    await page.goto(`/de/p/${provider.slug}/anfrage`);
    await expect(page).toHaveURL(new RegExp(`/de/p/${provider.slug}$`));
  });
});
