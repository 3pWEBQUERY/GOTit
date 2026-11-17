import { describe, expect, it } from "vitest";
import { draftQuery, parseDraft } from "./draft";

describe("Entwurf in der URL", () => {
  it("liest nur gültige Werte; die Nachricht steht nie in der URL", () => {
    expect(
      parseDraft({
        tag: "2026-11-19",
        zeit: "18:00",
        dauer: "90",
        region: "reg_1",
        nachricht: "geheim",
      }),
    ).toEqual({
      day: "2026-11-19",
      time: "18:00",
      duration: 90,
      regionId: "reg_1",
    });
    expect(
      parseDraft({
        tag: "19.11.2026",
        zeit: "25:00",
        dauer: "45",
        region: "<x>",
      }),
    ).toEqual({ day: null, time: null, duration: null, regionId: null });
  });

  it("schreibt nur gesetzte Werte zurück", () => {
    expect(
      draftQuery({
        day: "2026-11-19",
        time: null,
        duration: 60,
        regionId: null,
      }),
    ).toEqual({ tag: "2026-11-19", dauer: "60" });
  });
});
