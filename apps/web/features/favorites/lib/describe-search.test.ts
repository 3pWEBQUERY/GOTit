import { EMPTY_QUERY, parseSearchQuery } from "@app/core/search";
import { describe, expect, it } from "vitest";
import { describeSearch, type DescribeContext } from "./describe-search";

const regions: Record<string, string> = {
  "stadt-zuerich": "Zürich",
  bern: "Bern",
};
const categories: Record<string, string> = {
  massage: "Massage",
  begleitung: "Begleitung",
};
const languages: Record<string, string> = { de: "Deutsch", en: "Englisch" };

const context: DescribeContext = {
  t: (key, values) =>
    values ? `${key}(${Object.values(values).join("|")})` : key,
  regionName: (slug) => regions[slug] ?? null,
  categoryName: (slug) => categories[slug] ?? null,
  languageName: (code) => languages[code] ?? code,
  orList: (items) => items.join(" oder "),
  chf: (amount) => `CHF ${amount}`,
};

describe("describeSearch", () => {
  it("beschreibt alle Filter in der Reihenfolge der Gruppen", () => {
    const query = parseSearchQuery({
      q: "ruhig",
      ort: "stadt-zuerich",
      umkreis: "25",
      sprache: ["en", "de"],
      kategorie: "massage",
      preis_min: "100",
      preis_max: "300",
      fotos: "1",
      neu: "1",
    });
    expect(describeSearch(query, context)).toEqual([
      "text(ruhig)",
      "regionRadius(Zürich|25)",
      "languages(Deutsch oder Englisch)",
      "categories(Massage)",
      "priceBetween(CHF 100|CHF 300)",
      "photos",
      "newOnly",
    ]);
  });

  it("nennt nicht mehr freigegebene Regionen und Kategorien statt sie zu verschlucken", () => {
    const query = parseSearchQuery({
      ort: "gibt-es-nicht",
      kategorie: ["begleitung", "alt"],
    });
    expect(describeSearch(query, context)).toEqual([
      "regionUnknown",
      "categories(Begleitung)",
      "categoryUnknown",
    ]);
  });

  it("einseitige Preisgrenzen und Region ohne Umkreis", () => {
    expect(
      describeSearch(
        parseSearchQuery({ ort: "bern", preis_min: "50" }),
        context,
      ),
    ).toEqual(["region(Bern)", "priceMin(CHF 50)"]);
    expect(
      describeSearch(parseSearchQuery({ preis_max: "400" }), context),
    ).toEqual(["priceMax(CHF 400)"]);
  });

  it("ohne Filter ein ehrlicher Satz statt einer leeren Zeile", () => {
    expect(describeSearch(EMPTY_QUERY, context)).toEqual(["none"]);
  });
});
