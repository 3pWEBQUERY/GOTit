import { describe, expect, it } from "vitest";
import { isCurrentPath, isStudioPath, organizationSlugFromPath } from "./is-current";

describe("aktive Navigation", () => {
  it("markiert Wurzeln nur bei exakter Übereinstimmung", () => {
    expect(isCurrentPath("/de/studio", "/de/studio", ["/de/studio"])).toBe(true);
    expect(isCurrentPath("/de/studio/kalender", "/de/studio", ["/de/studio"])).toBe(false);
  });
  it("markiert Bereiche auch auf Unterseiten", () => {
    expect(isCurrentPath("/de/studio/kalender/verfuegbarkeit", "/de/studio/kalender", [])).toBe(true);
    expect(isCurrentPath("/de/studio/kalenderblatt", "/de/studio/kalender", [])).toBe(false);
  });
  it("ignoriert Query und Anker im Ziel", () => {
    expect(isCurrentPath("/de/suche", "/de/suche?verfuegbar=heute", [])).toBe(true);
  });
  it("erkennt Studio und Organisations-Kontext in jeder Sprache", () => {
    expect(isStudioPath("/fr/studio/calendrier")).toBe(true);
    expect(isStudioPath("/de/suche")).toBe(false);
    expect(organizationSlugFromPath("/it/studio/o/club-fiktiv/sedi")).toBe("club-fiktiv");
    expect(organizationSlugFromPath("/de/studio/kalender")).toBeNull();
  });
});
