import { describe, expect, it } from "vitest";
import { moveStep, moveTo } from "./reorder";

describe("Reihenfolge der Medien", () => {
  it("zieht ein Medium an die Stelle eines anderen", () => {
    expect(moveTo(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
    expect(moveTo(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
    expect(moveTo(["a", "b"], "a", "x")).toEqual(["a", "b"]);
  });
  it("Nach vorne und Nach hinten tauschen mit dem Nachbarn, am Rand ändert sich nichts", () => {
    expect(moveStep(["a", "b", "c"], "b", "forward")).toEqual(["b", "a", "c"]);
    expect(moveStep(["a", "b", "c"], "b", "backward")).toEqual(["a", "c", "b"]);
    expect(moveStep(["a", "b", "c"], "a", "forward")).toEqual(["a", "b", "c"]);
    expect(moveStep(["a", "b", "c"], "c", "backward")).toEqual(["a", "b", "c"]);
  });
});
