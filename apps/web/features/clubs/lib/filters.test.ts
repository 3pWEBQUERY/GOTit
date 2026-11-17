import { describe, expect, it } from "vitest";
import { clubsQuery, parseClubFilters } from "./filters";

describe("Filter von /clubs", () => {
  it("liest Art und bekannte Region, verwirft Unbekanntes", () => {
    expect(
      parseClubFilters({ art: "agentur", region: "zuerich" }, ["zuerich"]),
    ).toEqual({ kind: "AGENCY", region: "zuerich" });
    expect(
      parseClubFilters({ art: "bar", region: "nirgends" }, ["zuerich"]),
    ).toEqual({ kind: null, region: null });
    expect(parseClubFilters({ art: ["club", "agentur"] }, [])).toEqual({
      kind: "CLUB",
      region: null,
    });
  });

  it("schreibt nur gesetzte Filter in die URL", () => {
    expect(clubsQuery({ kind: "CLUB", region: "bern" })).toBe(
      "art=club&region=bern",
    );
    expect(clubsQuery({ kind: null, region: null })).toBe("");
  });
});
