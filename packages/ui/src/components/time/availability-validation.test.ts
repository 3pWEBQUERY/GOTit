import { describe, expect, it } from "vitest";
import { emptyAvailability, isAvailabilityValid, suggestWindow, validateAvailability, validateWindows, windowsOverlap } from "./availability-validation";

describe("validateWindows", () => {
  it("lässt gültige, getrennte Fenster durch", () => {
    expect(
      validateWindows([
        { from: "09:00", to: "12:00" },
        { from: "13:00", to: "17:00" },
      ]),
    ).toEqual([null, null]);
  });

  it("meldet, wenn bis nicht später ist als von", () => {
    expect(validateWindows([{ from: "14:00", to: "13:00" }])).toEqual(["endBeforeStart"]);
    expect(validateWindows([{ from: "14:00", to: "14:00" }])).toEqual(["endBeforeStart"]);
  });

  it("meldet Überlappung am späteren Fenster der Liste", () => {
    expect(
      validateWindows([
        { from: "09:00", to: "12:00" },
        { from: "11:30", to: "14:00" },
        { from: "15:00", to: "16:00" },
      ]),
    ).toEqual([null, "overlap", null]);
  });

  it("erkennt Überlappung unabhängig von der Reihenfolge", () => {
    expect(
      validateWindows([
        { from: "13:00", to: "17:00" },
        { from: "09:00", to: "13:30" },
      ]),
    ).toEqual([null, "overlap"]);
  });

  it("wertet aneinander grenzende Fenster nicht als Überlappung", () => {
    expect(
      validateWindows([
        { from: "09:00", to: "12:00" },
        { from: "12:00", to: "14:00" },
      ]),
    ).toEqual([null, null]);
  });

  it("meldet fehlende oder unlesbare Zeiten", () => {
    expect(validateWindows([{ from: "", to: "12:00" }])).toEqual(["incomplete"]);
    expect(validateWindows([{ from: "9 Uhr", to: "12:00" }])).toEqual(["incomplete"]);
  });

  it("vergleicht nicht mit fehlerhaften Fenstern", () => {
    expect(
      validateWindows([
        { from: "18:00", to: "09:00" },
        { from: "10:00", to: "11:00" },
      ]),
    ).toEqual(["endBeforeStart", null]);
  });
});

describe("windowsOverlap", () => {
  it("ist symmetrisch", () => {
    const a = { from: "09:00", to: "11:00" };
    const b = { from: "10:59", to: "12:00" };
    expect(windowsOverlap(a, b)).toBe(true);
    expect(windowsOverlap(b, a)).toBe(true);
  });
});

describe("validateAvailability", () => {
  it("prüft jeden Wochentag für sich", () => {
    const value = { ...emptyAvailability(), mon: [{ from: "09:00", to: "12:00" }], tue: [{ from: "12:00", to: "09:00" }] };
    const result = validateAvailability(value);
    expect(result.mon).toEqual([null]);
    expect(result.tue).toEqual(["endBeforeStart"]);
    expect(result.sun).toEqual([]);
    expect(isAvailabilityValid(value)).toBe(false);
    expect(isAvailabilityValid({ ...value, tue: [] })).toBe(true);
  });
});

describe("suggestWindow", () => {
  const fallback = { from: "09:00", to: "17:00" };

  it("nimmt für den ersten Eintrag das Standardfenster", () => {
    expect(suggestWindow([], fallback)).toEqual(fallback);
  });

  it("schlägt ein Fenster nach dem spätesten Ende vor", () => {
    expect(suggestWindow([{ from: "09:00", to: "12:00" }], fallback)).toEqual({ from: "13:00", to: "15:00" });
  });

  it("bleibt leer, wenn der Tag keinen Platz mehr hat", () => {
    expect(suggestWindow([{ from: "09:00", to: "23:30" }], fallback)).toEqual({ from: "", to: "" });
  });
});
