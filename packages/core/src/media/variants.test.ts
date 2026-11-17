import { describe, expect, it } from "vitest";
import { mediaSrcSet, mediaUrl, parseVariantName, variantName } from "./variants";

describe("Bildvarianten", () => {
  it("bildet Namen und URLs", () => {
    expect(variantName(640, "webp")).toBe("w640.webp");
    expect(mediaUrl("abc", 320, "avif")).toBe("/media/abc/w320.avif");
    expect(mediaSrcSet("abc", "webp")).toBe("/media/abc/w320.webp 320w, /media/abc/w640.webp 640w, /media/abc/w960.webp 960w, /media/abc/w1440.webp 1440w");
  });
  it("lässt nur die festen Varianten zu, keine Pfade oder anderen Breiten", () => {
    expect(parseVariantName("w960.avif")).toEqual({ width: 960, format: "avif" });
    expect(parseVariantName("w961.avif")).toBeNull();
    expect(parseVariantName("w640.jpg")).toBeNull();
    expect(parseVariantName("../original")).toBeNull();
    expect(parseVariantName("w640.webp/../x")).toBeNull();
  });
});
