import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown, plainText, safeHref } from "./markdown";

describe("Markdown des CMS", () => {
  it("liest Überschriften, Absätze und Listen", () => {
    const blocks = parseMarkdown("# Titel\n\nErste Zeile\nzweite Zeile\n\n- eins\n- zwei\n  weiter\n\n1. a\n2. b\n\n### Klein");
    expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "list", "list", "heading"]);
    expect(blocks[0]).toMatchObject({ type: "heading", level: 2 });
    expect(blocks[1]).toEqual({ type: "paragraph", children: [{ type: "text", value: "Erste Zeile zweite Zeile" }] });
    expect(blocks[2]).toMatchObject({ type: "list", ordered: false, items: [[{ type: "text", value: "eins" }], [{ type: "text", value: "zwei weiter" }]] });
    expect(blocks[3]).toMatchObject({ type: "list", ordered: true });
    expect(blocks[4]).toMatchObject({ type: "heading", level: 3 });
  });

  it("liest Hervorhebung, Code und Links", () => {
    expect(parseInline("**fett** und *kursiv* und `code`")).toEqual([
      { type: "strong", children: [{ type: "text", value: "fett" }] },
      { type: "text", value: " und " },
      { type: "em", children: [{ type: "text", value: "kursiv" }] },
      { type: "text", value: " und " },
      { type: "code", value: "code" },
    ]);
    expect(parseInline("[Hilfe](/de/hilfe) und [Web](https://example.org)")).toEqual([
      { type: "link", href: "/de/hilfe", children: [{ type: "text", value: "Hilfe" }] },
      { type: "text", value: " und " },
      { type: "link", href: "https://example.org", children: [{ type: "text", value: "Web" }] },
    ]);
  });

  it("lässt HTML als Text stehen und verwirft gefährliche Links", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([{ type: "text", value: "<script>alert(1)</script>" }]);
    expect(parseInline("[klick](javascript:alert(1))")).not.toContainEqual(expect.objectContaining({ type: "link" }));
    expect(parseInline("[klick](data:text/html;base64,x)")).toEqual([{ type: "text", value: "klick" }]);
    expect(safeHref("//fremd.example")).toBeNull();
    expect(safeHref("mailto:hilfe@fiktiv.test")).toBe("mailto:hilfe@fiktiv.test");
    expect(safeHref("#abschnitt")).toBe("#abschnitt");
  });

  it("verschachtelt keine Links und behält maskierte Zeichen", () => {
    expect(parseInline("[a [b](/x)](/y)")).not.toContainEqual(expect.objectContaining({ type: "link", children: expect.arrayContaining([expect.objectContaining({ type: "link" })]) }));
    expect(parseInline("\\*kein\\* Stern")).toEqual([{ type: "text", value: "*kein* Stern" }]);
    expect(parseInline("2 * 3 * 4")).toEqual([{ type: "text", value: "2 * 3 * 4" }]);
  });

  it("liefert reinen Text", () => {
    expect(plainText(parseMarkdown("## Titel\n\n**Fett** und [Link](/a)"))).toBe("Titel Fett und Link");
  });
});
