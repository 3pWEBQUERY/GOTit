import { EMPTY_QUERY, parseSearchQuery } from "@app/core/search/query";
import { describe, expect, it } from "vitest";
import {
  hasOwnFilters,
  keepsPreset,
  presetQuery,
  resetQuery,
  searchUrl,
  toQueryString,
  withFilters,
  type SearchPaths,
} from "./url";

const search: SearchPaths = { search: "/de/suche", preset: null };
const city: SearchPaths = {
  search: "/de/suche",
  preset: { path: "/de/ch/zuerich/stadt-zuerich", region: "stadt-zuerich" },
};
const category: SearchPaths = {
  search: "/de/suche",
  preset: { path: "/de/kategorie/massage", category: "massage" },
};

describe("Such-URLs (Entscheid 0013)", () => {
  it("schreibt Listen mit Komma und lässt Voreinstellungen weg", () => {
    expect(toQueryString({ sprache: ["de", "en"], fotos: "1" })).toBe(
      "?sprache=de,en&fotos=1",
    );
    expect(toQueryString({})).toBe("");
    expect(searchUrl(search, EMPTY_QUERY)).toBe("/de/suche");
  });

  it("gleiche Suche, gleiche URL: hin und zurück ohne Verlust", () => {
    const query = parseSearchQuery({
      ort: "bern",
      umkreis: "25",
      sprache: "en,de",
      preis_max: "300",
      seite: "2",
      ansicht: "liste",
    });
    const url = searchUrl(search, query);
    expect(url).toBe(
      "/de/suche?ort=bern&umkreis=25&sprache=de,en&preis_max=300&ansicht=liste&seite=2",
    );
    expect(
      parseSearchQuery(
        Object.fromEntries(new URL(url, "http://x").searchParams),
      ),
    ).toEqual(query);
  });

  it("Landingpage: die Region kommt aus dem Pfad, ein `ort` in der URL zählt nicht", () => {
    const query = presetQuery(
      { ort: "bern", sprache: "de", umkreis: "10" },
      city.preset,
    );
    expect(query.region).toBe("stadt-zuerich");
    expect(query.radiusKm).toBe(10);
    expect(searchUrl(city, query)).toBe(
      "/de/ch/zuerich/stadt-zuerich?umkreis=10&sprache=de",
    );
  });

  it("zusätzliche Filter bleiben auf der Landingpage, eine geänderte Voreinstellung führt zu /suche", () => {
    const query = presetQuery({}, city.preset);
    expect(searchUrl(city, withFilters(query, { photos: true }))).toBe(
      "/de/ch/zuerich/stadt-zuerich?fotos=1",
    );
    expect(searchUrl(city, withFilters(query, { region: "bern" }))).toBe(
      "/de/suche?ort=bern",
    );
    expect(searchUrl(city, withFilters(query, { region: null }))).toBe(
      "/de/suche",
    );
    const massage = presetQuery({ sprache: "fr" }, category.preset);
    expect(searchUrl(category, massage)).toBe(
      "/de/kategorie/massage?sprache=fr",
    );
    expect(
      searchUrl(
        category,
        withFilters(massage, { categories: ["massage", "tantra"] }),
      ),
    ).toBe("/de/suche?sprache=fr&kategorie=massage,tantra");
    expect(keepsPreset(massage, { path: "/x", category: "massage" })).toBe(
      true,
    );
  });

  it("zurücksetzen behält Voreinstellung, Sortierung und Ansicht", () => {
    const query = presetQuery(
      { sprache: "de", sortierung: "neu", ansicht: "liste", seite: "3" },
      city.preset,
    );
    expect(hasOwnFilters(query, city.preset)).toBe(true);
    const reset = resetQuery(query, city.preset);
    expect(reset).toEqual({
      ...EMPTY_QUERY,
      region: "stadt-zuerich",
      sort: "neu",
      view: "liste",
    });
    expect(hasOwnFilters(reset, city.preset)).toBe(false);
    expect(searchUrl(city, reset)).toBe(
      "/de/ch/zuerich/stadt-zuerich?sortierung=neu&ansicht=liste",
    );
  });

  it("ein geänderter Filter springt auf Seite 1, ohne Region fällt der Umkreis weg", () => {
    const query = parseSearchQuery({ ort: "bern", umkreis: "50", seite: "4" });
    expect(withFilters(query, { photos: true }).page).toBe(1);
    expect(withFilters(query, { region: null }).radiusKm).toBeNull();
  });
});
