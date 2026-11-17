import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "../search/query";
import { UNFILTERED_SEARCH_KEY, impressionSearchKey } from "./web";

describe("impressionSearchKey", () => {
  it("enthält nur Filter, nie den Freitext, die Sortierung oder die Seite", () => {
    const query = parseSearchQuery({
      q: "geheimer Text",
      ort: "stadt-zuerich",
      sprache: ["en", "de"],
      sortierung: "neu",
      seite: "3",
    });
    const key = impressionSearchKey(query);
    expect(key).toBe("ort=stadt-zuerich&sprache=de,en");
    expect(key).not.toContain("geheim");
  });

  it("ohne Filter steht ein eigener Schlüssel, nie ein leerer", () => {
    expect(impressionSearchKey(parseSearchQuery({ q: "nur Text" }))).toBe(
      UNFILTERED_SEARCH_KEY,
    );
  });
});
