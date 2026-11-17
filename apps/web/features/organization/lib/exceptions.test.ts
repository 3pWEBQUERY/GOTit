import { describe, expect, it } from "vitest";
import { exceptionErrors, minuteLabel, toExceptionInput } from "./exceptions";

const base = { day: "2026-12-24", closed: true, from: "", to: "", note: "" };

describe("Ausnahmen der Öffnungszeiten", () => {
  it("verlangt einen Tag; geschlossen braucht keine Zeiten", () => {
    expect(exceptionErrors({ ...base, day: "" })).toEqual({
      day: "dayRequired",
    });
    expect(exceptionErrors(base)).toEqual({});
    expect(toExceptionInput(base)).toEqual({
      day: "2026-12-24",
      closed: true,
      startMinute: null,
      endMinute: null,
      note: "",
    });
  });

  it("andere Zeiten: beide Zeiten, Ende nach Beginn, 23:59 als Mitternacht", () => {
    expect(exceptionErrors({ ...base, closed: false })).toEqual({
      from: "timeRequired",
      to: "timeRequired",
    });
    expect(
      exceptionErrors({ ...base, closed: false, from: "20:00", to: "18:00" }),
    ).toEqual({ to: "endBeforeStart" });
    expect(
      exceptionErrors({ ...base, closed: false, from: "20:00", to: "23:59" }),
    ).toEqual({});
    expect(
      toExceptionInput({ ...base, closed: false, from: "20:00", to: "23:59" }),
    ).toMatchObject({ startMinute: 1200, endMinute: 1440 });
  });

  it("begrenzt die Notiz und schreibt Minuten als Zeit", () => {
    expect(exceptionErrors({ ...base, note: "x".repeat(201) })).toEqual({
      note: "noteTooLong",
    });
    expect(minuteLabel(1440)).toBe("24:00");
    expect(minuteLabel(65)).toBe("01:05");
  });
});
