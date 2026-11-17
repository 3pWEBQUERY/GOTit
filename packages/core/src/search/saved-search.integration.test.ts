import { getDb } from "@app/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseSearchQuery } from "./query";
import {
  deleteSavedSearch,
  findSavedSearch,
  listSavedSearches,
  renameSavedSearch,
  saveSearch,
} from "./saved-search";

const db = getDb();
const run = `${Date.now()}`;
const owner = `it_gespeichert_${run}`;
const other = `it_gespeichert_fremd_${run}`;

beforeAll(async () => {
  for (const id of [owner, other])
    await db.user.create({
      data: {
        id,
        name: "Fiktiv",
        email: `${id}@fiktiv.test`,
        emailVerified: true,
      },
    });
});
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: [owner, other] } } });
});

describe("Gespeicherte Suchen (PRD v1 FR-SEARCH-005)", () => {
  it("speichert nur Filter, ohne Duplikate; Sortierung und Seite zählen nicht", async () => {
    const first = await saveSearch(
      owner,
      parseSearchQuery({
        ort: "basel",
        sprache: "de",
        sortierung: "preis",
        seite: "3",
      }),
      "Basel",
    );
    expect(first).toMatchObject({ ok: true, existed: false });
    const again = await saveSearch(
      owner,
      parseSearchQuery({ sprache: "de", ort: "basel" }),
      "Nochmals",
    );
    expect(again).toMatchObject({ ok: true, existed: true });
    const [saved] = await listSavedSearches(owner);
    expect(saved?.query).toMatchObject({
      region: "basel",
      languages: ["de"],
      sort: "relevanz",
      page: 1,
    });
    expect(
      await findSavedSearch(
        owner,
        parseSearchQuery({ ort: "basel", sprache: "de", ansicht: "liste" }),
      ),
    ).toBe(saved?.id);
    expect(
      await findSavedSearch(
        other,
        parseSearchQuery({ ort: "basel", sprache: "de" }),
      ),
    ).toBeNull();
  });

  it("eine Suche ohne Filter lässt sich nicht speichern", async () => {
    expect(
      await saveSearch(owner, parseSearchQuery({ sortierung: "neu" }), "Alles"),
    ).toEqual({ ok: false, reason: "empty" });
  });

  it("umbenennen und löschen nur die eigene", async () => {
    const result = await saveSearch(
      owner,
      parseSearchQuery({ fotos: "1" }),
      "Mit Fotos",
    );
    if (!result.ok) throw new Error(result.reason);
    expect(await renameSavedSearch(other, result.id, "Fremd")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(
      await renameSavedSearch(owner, result.id, "Nur mit Fotos"),
    ).toMatchObject({ ok: true });
    expect(await deleteSavedSearch(other, result.id)).toBe(false);
    expect(await deleteSavedSearch(owner, result.id)).toBe(true);
  });
});
