import { describe, expect, it } from "vitest";
import { createFailureField, needsRefresh } from "./errors";
import { eventWord, visibleReason } from "./status-view";

describe("Verlauf", () => {
  it("«Aus Sicherheitsgründen» sieht nur, wer so abgesagt hat; die Gegenseite sieht «Abgesagt» ohne Grund", () => {
    expect(eventWord("cancel-safety", "MEMBER", "MEMBER")).toBe("cancelSafety");
    expect(eventWord("cancel-safety", "MEMBER", "PROVIDER")).toBe("cancel");
    expect(
      visibleReason(
        { action: "cancel-safety", actorRole: "MEMBER", reason: "x" },
        "PROVIDER",
      ),
    ).toBeNull();
    expect(
      visibleReason(
        { action: "cancel", actorRole: "MEMBER", reason: "x" },
        "PROVIDER",
      ),
    ).toBe("x");
    expect(eventWord("unbekannt", null, "MEMBER")).toBeNull();
  });
});

describe("Fehler am richtigen Ort", () => {
  it("Zeitfragen an der Uhrzeit, eine ungültige Region an der Region, der Rest oben", () => {
    expect(createFailureField("unavailable", false)).toBe("time");
    expect(createFailureField("too-soon", true)).toBe("time");
    expect(createFailureField("invalid", true)).toBe("region");
    expect(createFailureField("invalid", false)).toBe("form");
    expect(createFailureField("duplicate", false)).toBe("form");
    expect(needsRefresh("stale")).toBe(true);
    expect(needsRefresh("rate-limited")).toBe(false);
  });
});
