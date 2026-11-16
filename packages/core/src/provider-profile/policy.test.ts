import { describe, expect, it } from "vitest";
import { pauseAvailability } from "./policy";

describe("Profil pausieren (PRD 6.2)", () => {
  it("ein veröffentlichtes Profil lässt sich pausieren", () => {
    expect(pauseAvailability("PUBLISHED")).toEqual({ action: "pause", blockedBy: null });
  });
  it("ein pausiertes Profil lässt sich wieder online stellen", () => {
    expect(pauseAvailability("PAUSED")).toEqual({ action: "resume", blockedBy: null });
  });
  it.each(["DRAFT", "SUBMITTED", "CHANGES_REQUESTED", "ARCHIVED"] as const)(
    "im Status %s gibt es keine Aktion: das Profil war nie freigegeben",
    (status) => {
      expect(pauseAvailability(status)).toEqual({ action: null, blockedBy: "not-published" });
    },
  );
  it("ein gesperrtes Profil kommt über Pausieren nicht wieder online", () => {
    expect(pauseAvailability("SUSPENDED")).toEqual({ action: null, blockedBy: "suspended" });
  });
});
