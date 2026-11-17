import { describe, expect, it } from "vitest";
import { completeness } from "./completeness";
import { toPrefixTsQuery } from "./postgres-search";
import {
  EMPTY_QUERY,
  activeFilters,
  parseSearchQuery,
  queryKey,
  toSearchParams,
  withoutFilter,
} from "./query";
import { distanceKm } from "./region-filter";

describe("Suchparameter in der URL (PRD v2 9.2)", () => {
  it("liest alle Filter und schreibt sie unverändert zurück", () => {
    const raw = {
      q: "  Abend  ",
      ort: "stadt-zuerich",
      umkreis: "25",
      sprache: ["en", "de"],
      kategorie: "massage",
      preis_min: "100",
      preis_max: "400",
      fotos: "1",
      neu: "1",
      sortierung: "preis",
      ansicht: "liste",
      seite: "3",
    };
    const query = parseSearchQuery(raw);
    expect(query).toEqual({
      q: "Abend",
      region: "stadt-zuerich",
      radiusKm: 25,
      languages: ["de", "en"],
      categories: ["massage"],
      priceMin: 100,
      priceMax: 400,
      photos: true,
      newOnly: true,
      sort: "preis",
      view: "liste",
      page: 3,
    });
    expect(parseSearchQuery(toSearchParams(query))).toEqual(query);
  });

  it("verwirft Ungültiges still, statt einen Fehler zu zeigen", () => {
    const query = parseSearchQuery({
      ort: "../etc",
      umkreis: "7",
      sprache: "deutsch",
      kategorie: "A B",
      preis_min: "-5",
      preis_max: "abc",
      fotos: "ja",
      sortierung: "beliebtheit",
      ansicht: "karte",
      seite: "0",
    });
    expect(query).toEqual(EMPTY_QUERY);
  });

  it("ohne Region kein Umkreis, weil der Mittelpunkt fehlt", () => {
    expect(parseSearchQuery({ umkreis: "25" }).radiusKm).toBeNull();
  });

  it("vertauschte Preisgrenzen werden getauscht", () => {
    const query = parseSearchQuery({ preis_min: "500", preis_max: "100" });
    expect([query.priceMin, query.priceMax]).toEqual([100, 500]);
  });

  it("begrenzt Seite, Freitext und Mehrfachwerte", () => {
    const query = parseSearchQuery({
      seite: "999",
      q: "x".repeat(200),
      sprache: "de,en,fr,it,es,pt,nl,pl,ru,tr,ar,zh",
    });
    expect(query.page).toBe(20);
    expect(query.q).toHaveLength(80);
    expect(query.languages).toHaveLength(10);
  });

  it("gleiche Filter ergeben denselben Schlüssel, unabhängig von Reihenfolge, Sortierung und Seite", () => {
    const a = parseSearchQuery({
      sprache: "en,de",
      ort: "basel",
      sortierung: "neu",
      seite: "2",
    });
    const b = parseSearchQuery({ ort: "basel", sprache: ["de", "en"] });
    expect(queryKey(a)).toBe(queryKey(b));
    expect(queryKey(EMPTY_QUERY)).toBe("");
  });

  it("entfernt einzelne Filter und springt auf Seite 1; ohne Region fällt der Umkreis mit", () => {
    const query = parseSearchQuery({
      ort: "basel",
      umkreis: "10",
      fotos: "1",
      seite: "4",
    });
    expect(activeFilters(query)).toEqual(["region", "radiusKm", "photos"]);
    const next = withoutFilter(query, "region");
    expect(next.region).toBeNull();
    expect(next.radiusKm).toBeNull();
    expect(next.page).toBe(1);
    expect(next.photos).toBe(true);
  });
});

describe("Freitext als Präfixsuche", () => {
  it("jedes Wort als Präfix, Sonderzeichen fallen weg", () => {
    expect(toPrefixTsQuery("Zür & ich!")).toBe("zür:* & ich:*");
    expect(toPrefixTsQuery("'); drop table")).toBe("drop:* & table:*");
    expect(toPrefixTsQuery("&&&")).toBeNull();
  });
});

describe("Ranking-Bausteine", () => {
  it("Vollständigkeit von 0 bis 100", () => {
    expect(
      completeness({
        hasShortDescription: false,
        descriptionLength: 0,
        languageCount: 0,
        serviceCount: 0,
        rateCount: 0,
        photoCount: 0,
      }),
    ).toBe(0);
    expect(
      completeness({
        hasShortDescription: true,
        descriptionLength: 400,
        languageCount: 2,
        serviceCount: 3,
        rateCount: 1,
        photoCount: 5,
      }),
    ).toBe(100);
  });

  it("Entfernung zwischen Ortsmittelpunkten", () => {
    const zuerich = { latitude: 47.3769, longitude: 8.5417 };
    const bern = { latitude: 46.948, longitude: 7.4474 };
    expect(Math.round(distanceKm(zuerich, bern))).toBe(95);
    expect(distanceKm(zuerich, zuerich)).toBe(0);
  });
});
