import { describe, expect, it } from "vitest";
import { parseProviderSlug } from "./provider-slug";

describe("parseProviderSlug", () => {
  it.each([
    ["lena-zh", "lena-zh"],
    ["  Lena-ZH ", "lena-zh"],
    ["@lena-zh", "lena-zh"],
    ["https://example.ch/de/p/lena-zh", "lena-zh"],
    ["https://example.ch/fr/p/lena-zh/avis?x=1#top", "lena-zh"],
    ["example.ch/de/p/lena-zh/", "lena-zh"],
    ["/de/p/lena-zh", "lena-zh"],
  ])("%s ergibt %s", (input, expected) => {
    expect(parseProviderSlug(input)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "https://example.ch/de/suche",
    "lena zh",
    "lena_zh",
    "https://example.ch/de/p/",
    "a".repeat(81),
  ])("%s ergibt null", (input) => {
    expect(parseProviderSlug(input)).toBeNull();
  });
});
