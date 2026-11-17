import { describe, expect, it } from "vitest";
import { inboxQuery, parseInboxParams } from "./inbox-params";

describe("Postfach in der URL", () => {
  it("liest Ansicht, Suche und Label; Unbekanntes fällt auf den Standard zurück", () => {
    expect(
      parseInboxParams({
        ansicht: "ungelesen",
        q: "  Anna   B ",
        label: "lbl_1",
      }),
    ).toEqual({
      view: "ungelesen",
      q: "Anna B",
      labelId: "lbl_1",
    });
    expect(parseInboxParams({ ansicht: "geheim", label: "../x" })).toEqual({
      view: "alle",
      q: "",
      labelId: null,
    });
  });

  it("lässt Standardwerte in Links weg", () => {
    expect(inboxQuery({ view: "alle", q: "", labelId: null })).toEqual({});
    expect(
      inboxQuery({ view: "archiviert", q: "Rosa", labelId: "l1" }),
    ).toEqual({
      ansicht: "archiviert",
      q: "Rosa",
      label: "l1",
    });
  });
});
