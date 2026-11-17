import { cleanup, query } from "./admin-fixtures";
import {
  createBookingProvider,
  dayIn,
  openCalendar,
  swiss,
} from "./booking-studio-fixtures";
import { signedInPage } from "./messages-fixtures";
import { expectNoSeriousAxeFindings } from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Studio, Verfügbarkeit und Blocker (v1 FR-BOOKING-001, v2 7.3, Entscheid 0016):
 * Arbeitszeiten, Regeln und Exklusivbelegung bleiben gespeichert; Blocker
 * entstehen im Kalender und lassen sich nach Rückfrage entfernen.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));
test.use({ viewport: { width: 1280, height: 900 } });

test.describe("Studio: Verfügbarkeit", () => {
  test("Arbeitszeiten, Regeln und Exklusivbelegung werden gespeichert; Fehler stehen am Feld", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookingProvider(created, { windows: false });
    const page = await signedInPage(browser, provider, baseURL);

    await page.goto("/de/studio/kalender");
    await expect(
      page.getByText(
        "Hier erscheinen deine freien Zeiten, Anfragen und Termine.",
      ),
    ).toBeVisible();
    await page.getByRole("link", { name: "Arbeitszeiten eintragen" }).click();
    await expect(page).toHaveURL(/\/de\/studio\/kalender\/verfuegbarkeit$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Verfügbarkeit" }),
    ).toBeVisible();
    await expectNoSeriousAxeFindings(page);

    const form = page.locator("[data-windows-form]");
    await form.getByRole("switch", { name: "Montag verfügbar" }).click();
    const monday = form.getByRole("group", { name: "Montag, Zeitfenster 1" });
    await monday.getByRole("textbox", { name: "Bis" }).fill("08:00");
    await monday.getByRole("textbox", { name: "Bis" }).blur();
    await expect(
      monday.getByText("Das Ende muss nach dem Beginn liegen."),
    ).toBeVisible();
    await form.getByRole("button", { name: "Arbeitszeiten speichern" }).click();
    await expect(form.getByRole("status")).toHaveText(
      "Noch nicht gespeichert. Korrigiere die markierten Zeitfenster.",
    );

    await monday.getByRole("textbox", { name: "Bis" }).fill("18:30");
    await monday.getByRole("textbox", { name: "Bis" }).blur();
    await form.getByRole("switch", { name: "Samstag verfügbar" }).click();
    await form.getByRole("button", { name: "Arbeitszeiten speichern" }).click();
    await expect(form.getByRole("status")).toHaveText(
      "Arbeitszeiten gespeichert",
    );

    const settings = page.locator("[data-settings-form]");
    await settings
      .getByRole("combobox", { name: "Puffer zwischen Terminen" })
      .click();
    await page.getByRole("option", { name: "30 Minuten" }).click();
    await settings
      .getByRole("combobox", { name: "Gültigkeit einer Anfrage" })
      .click();
    await page.getByRole("option", { name: "24 Stunden" }).click();
    await settings.getByRole("button", { name: "Regeln speichern" }).click();
    await expect(
      page.getByText("Regeln gespeichert", { exact: true }),
    ).toBeVisible();

    const exclusive = page.getByRole("switch", {
      name: "Nur ein Termin zur selben Zeit",
    });
    await expect(exclusive).toBeChecked();
    await exclusive.click();
    await expect(page.getByText("Gespeichert", { exact: true })).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("switch", { name: "Montag verfügbar" }),
    ).toBeChecked();
    await expect(
      page
        .getByRole("group", { name: "Montag, Zeitfenster 1" })
        .getByRole("textbox", { name: "Bis" }),
    ).toHaveValue("18:30");
    await expect(
      page.getByRole("switch", { name: "Dienstag verfügbar" }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("combobox", { name: "Puffer zwischen Terminen" }),
    ).toContainText("30 Minuten");
    await expect(
      page.getByRole("switch", { name: "Nur ein Termin zur selben Zeit" }),
    ).not.toBeChecked();
    const windows = await query<{
      weekday: number;
      startMinute: number;
      endMinute: number;
    }>(
      `select weekday, "startMinute", "endMinute" from availability_window where "providerProfileId" = $1 order by weekday`,
      [provider.profileId],
    );
    expect(windows).toEqual([
      { weekday: 1, startMinute: 540, endMinute: 1110 },
      { weekday: 6, startMinute: 540, endMinute: 1020 },
    ]);
    const [stored] = await query<{
      bufferMinutes: number;
      requestTtlHours: number;
      exclusiveBooking: boolean;
    }>(
      `select "bufferMinutes", "requestTtlHours", "exclusiveBooking" from calendar_settings where "providerProfileId" = $1`,
      [provider.profileId],
    );
    expect(stored).toEqual({
      bufferMinutes: 30,
      requestTtlHours: 24,
      exclusiveBooking: false,
    });

    await page.goto("/de/studio/kalender");
    await expect(
      page.getByText(
        "Hier erscheinen deine freien Zeiten, Anfragen und Termine.",
      ),
    ).toHaveCount(0);
  });

  test("Blocker im Kalender eintragen, im Panel ansehen und nach Rückfrage entfernen; Abwesenheit in der Liste", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createBookingProvider(created);
    const page = await signedInPage(browser, provider, baseURL);
    const day = dayIn(9);
    await openCalendar(page, "woche", day);

    await page.getByRole("button", { name: "Blocker eintragen" }).click();
    const dialog = page.getByRole("dialog", { name: "Zeit blockieren" });
    await dialog
      .getByRole("textbox", { name: "Beginn", exact: true })
      .fill(swiss(day));
    await dialog
      .getByRole("textbox", { name: "Beginn, Uhrzeit" })
      .fill("15:00");
    await dialog
      .getByRole("textbox", { name: "Ende", exact: true })
      .fill(swiss(day));
    await dialog.getByRole("textbox", { name: "Ende, Uhrzeit" }).fill("14:00");
    await dialog
      .getByRole("textbox", { name: /Private Notiz/ })
      .fill("Fiktiver privater Termin");
    await dialog.getByRole("button", { name: "Blocker speichern" }).click();
    await expect(
      dialog.getByText("Das Ende muss nach dem Beginn liegen."),
    ).toBeVisible();
    await dialog.getByRole("textbox", { name: "Ende, Uhrzeit" }).fill("16:30");
    await dialog.getByRole("button", { name: "Blocker speichern" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByText("Blocker gespeichert", { exact: true }),
    ).toBeVisible();

    const entry = page.locator("[data-calendar]").getByRole("button", {
      name: /15:00–16:30.*Fiktiver privater Termin.*Blockiert/,
    });
    await expect(entry).toBeVisible();
    await entry.click();
    const panel = page.getByRole("dialog", { name: "Blocker" });
    await expect(panel).toContainText("Fiktiver privater Termin");
    await expect(page).toHaveURL(/blocker=/);
    await panel.getByRole("button", { name: "Blocker entfernen" }).click();
    await expect(
      panel.getByRole("heading", { name: "Diesen Eintrag entfernen?" }),
    ).toBeFocused();
    await expect(panel).toContainText("Die private Notiz geht verloren.");
    await panel
      .getByRole("group")
      .getByRole("button", { name: "Blocker entfernen" })
      .click();
    await expect(panel).toBeHidden();
    await expect(
      page.getByText("Eintrag entfernt", { exact: true }),
    ).toBeVisible();
    await expect(entry).toHaveCount(0);
    expect(
      await query(
        `select id from calendar_block where "providerProfileId" = $1`,
        [provider.profileId],
      ),
    ).toEqual([]);

    await page.goto("/de/studio/kalender/verfuegbarkeit");
    await page.getByRole("button", { name: "Eintrag hinzufügen" }).click();
    const absence = page.getByRole("dialog", { name: "Zeit blockieren" });
    await expect(
      absence.getByRole("radio", { name: /Abwesenheit/ }),
    ).toBeChecked();
    await absence
      .getByRole("textbox", { name: "Erster Tag" })
      .fill(swiss(dayIn(20)));
    await absence
      .getByRole("textbox", { name: "Letzter Tag" })
      .fill(swiss(dayIn(22)));
    await absence
      .getByRole("button", { name: "Abwesenheit speichern" })
      .click();
    await expect(absence).toBeHidden();
    const list = page.getByRole("list", {
      name: "Kommende Abwesenheiten und Blocker",
    });
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await expect(list).toContainText("Abwesenheit");
    await list
      .getByRole("button", { name: /Abwesenheit am .* entfernen/ })
      .click();
    const confirm = page.getByRole("alertdialog", {
      name: "Diesen Eintrag entfernen?",
    });
    await confirm
      .getByRole("button", { name: "Abwesenheit entfernen" })
      .click();
    await expect(
      page.getByText(
        "Hier erscheinen Ferien, Abwesenheiten und blockierte Zeiten.",
      ),
    ).toBeVisible();
  });
});
