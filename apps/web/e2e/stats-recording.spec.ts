import { cleanup } from "./admin-fixtures";
import { createProvider, signedInPage } from "./messages-fixtures";
import { indexedProviders, keyword, visitor } from "./search-fixtures";
import { countEvents, publishedMedia, searchKeys } from "./stats-fixtures";
import { expect, test } from "./support/test";

/**
 * Erfassen in der Web-App (Entscheid 0019): Profilaufrufe einmal pro Besucher
 * und Tag, nie der Inhaber; Einblendungen mit den Filtern, nie dem Freitext;
 * Medienaufrufe beim Öffnen in der Lightbox.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

/** Erfasst wird nach der Antwort; kurz warten, ob nicht doch noch etwas dazukommt. */
async function settled(
  read: () => Promise<number>,
  expected: number,
): Promise<void> {
  await expect.poll(read, { timeout: 10_000 }).toBe(expected);
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  expect(await read()).toBe(expected);
}

test.describe("Statistik: Erfassen", () => {
  test("ein Besucher zählt einmal pro Tag, der Inhaber nie", async ({
    browser,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const views = () => countEvents(provider.profileId, "PROFILE_VIEW");
    const page = await visitor(browser, `/de/p/${provider.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      provider.displayName,
    );
    await settled(views, 1);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      provider.displayName,
    );
    await settled(views, 1);

    const owner = await signedInPage(browser, provider, baseURL);
    await owner.goto(`/de/p/${provider.slug}`);
    await expect(owner.getByRole("heading", { level: 1 })).toHaveText(
      provider.displayName,
    );
    await settled(views, 1);
  });

  test("eine Suche zählt Einblendungen mit den Filtern, ohne den eingegebenen Text", async ({
    browser,
  }) => {
    const word = keyword();
    const [hit] = await indexedProviders(created, word, [
      { languages: ["de"] },
    ]);
    if (!hit) throw new Error("kein Profil");
    const page = await visitor(browser, `/de/suche?q=${word}&sprache=de`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "1 Profil",
    );
    // Einmal pro gerenderter Ergebnisseite; vor der Altersprüfung zählt nichts.
    await expect
      .poll(() => searchKeys(hit.profileId), { timeout: 10_000 })
      .toEqual(["sprache=de"]);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "1 Profil",
    );
    await expect
      .poll(() => searchKeys(hit.profileId), { timeout: 10_000 })
      .toEqual(["sprache=de", "sprache=de"]);
    expect(
      (await searchKeys(hit.profileId)).join(" ").toLowerCase(),
    ).not.toContain(word.toLowerCase());
  });

  test("Öffnen in der Lightbox zählt einen Medienaufruf, nur einmal pro Tag", async ({
    browser,
  }) => {
    const provider = await createProvider(created);
    await publishedMedia(
      provider.profileId,
      provider.id,
      "Fiktives Foto im Garten",
    );
    const page = await visitor(browser, `/de/p/${provider.slug}`);
    const media = () => countEvents(provider.profileId, "MEDIA_VIEW");
    await page.getByRole("button", { name: "Fiktives Foto im Garten" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await settled(media, 1);
    await page.keyboard.press("Escape");
    await page.reload();
    await page.getByRole("button", { name: "Fiktives Foto im Garten" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await settled(media, 1);
  });
});
