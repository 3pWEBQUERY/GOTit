import { parseSearchQuery } from "@app/core/search/query";
import { describe, expect, it } from "vitest";
import {
  filterLabels,
  savedSearchName,
  type FilterLabelSource,
} from "./filter-labels";

const source: FilterLabelSource = {
  regionName: (slug) => ({ "stadt-zuerich": "Zürich" })[slug] ?? null,
  categoryName: (slug) => ({ massage: "Massage" })[slug] ?? null,
  languageName: (code) => ({ de: "Deutsch", en: "Englisch" })[code] ?? code,
  list: (items) => items.join(" oder "),
  t: {
    text: (text) => `«${text}»`,
    radius: (km) => `Umkreis ${km} km`,
    priceRange: (min, max) => `CHF ${min} bis ${max}`,
    priceFrom: (min) => `ab CHF ${min}`,
    priceTo: (max) => `bis CHF ${max}`,
    photos: "Fotos geprüft",
    newOnly: "Neu",
  },
};

describe("Texte der Filter", () => {
  it("ein Chip pro aktivem Filter in fester Reihenfolge", () => {
    const query = parseSearchQuery({
      q: "anna",
      ort: "stadt-zuerich",
      umkreis: "25",
      sprache: "en,de",
      kategorie: "massage",
      preis_min: "100",
      fotos: "1",
      neu: "1",
    });
    expect(filterLabels(query, source)).toEqual([
      { key: "q", label: "«anna»" },
      { key: "region", label: "Zürich" },
      { key: "radiusKm", label: "Umkreis 25 km" },
      { key: "languages", label: "Deutsch oder Englisch" },
      { key: "categories", label: "Massage" },
      { key: "price", label: "ab CHF 100" },
      { key: "photos", label: "Fotos geprüft" },
      { key: "newOnly", label: "Neu" },
    ]);
    expect(
      filterLabels(
        parseSearchQuery({ preis_min: "300", preis_max: "100" }),
        source,
      ),
    ).toEqual([{ key: "price", label: "CHF 100 bis 300" }]);
  });

  it("unbekannte Region oder Kategorie: der Slug statt nichts", () => {
    expect(filterLabels(parseSearchQuery({ ort: "atlantis" }), source)).toEqual(
      [{ key: "region", label: "atlantis" }],
    );
  });

  it("Name einer gespeicherten Suche aus den Filtern, höchstens 60 Zeichen", () => {
    expect(
      savedSearchName(
        filterLabels(
          parseSearchQuery({ ort: "stadt-zuerich", sprache: "de", fotos: "1" }),
          source,
        ),
        "Meine Suche",
      ),
    ).toBe("Zürich · Deutsch · Fotos geprüft");
    expect(savedSearchName([], "Meine Suche")).toBe("Meine Suche");
    const long = savedSearchName(
      [{ key: "q", label: "x".repeat(80) }],
      "Meine Suche",
    );
    expect(long).toHaveLength(60);
    expect(long.endsWith("…")).toBe(true);
  });
});
