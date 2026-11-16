import { describe, expect, it } from "vitest";
import { isFlagOn } from "./policy";

describe("Feature Flags", () => {
  it("behandelt ein fehlendes Flag als aus", () => {
    expect(isFlagOn(null)).toBe(false);
  });
  it("respektiert den Schalter", () => {
    expect(isFlagOn({ enabled: false, disabledRegions: [] })).toBe(false);
    expect(isFlagOn({ enabled: true, disabledRegions: [] })).toBe(true);
  });
  it("lässt sich pro Region abschalten", () => {
    const state = { enabled: true, disabledRegions: ["genf"] };
    expect(isFlagOn(state, "genf")).toBe(false);
    expect(isFlagOn(state, "zuerich")).toBe(true);
    expect(isFlagOn(state, null)).toBe(true);
  });
});
