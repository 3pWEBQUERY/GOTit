/**
 * Kleiner, sicherer Markdown-Leser für Seiten aus dem CMS (Entscheid 0022).
 * Er kennt Überschriften, Absätze, Listen, Links, Hervorhebung und Code im
 * Text. HTML gibt es nicht: Alles ist Text und wird von React maskiert. Links
 * sind nur mit `https:`, `http:`, `mailto:` oder als Pfad der Plattform
 * erlaubt; andere bleiben Text.
 */
export type MarkdownInline =
  | { type: "text"; value: string }
  | { type: "strong"; children: MarkdownInline[] }
  | { type: "em"; children: MarkdownInline[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: MarkdownInline[] };

export type MarkdownBlock =
  | { type: "heading"; level: 2 | 3 | 4; children: MarkdownInline[] }
  | { type: "paragraph"; children: MarkdownInline[] }
  | { type: "list"; ordered: boolean; items: MarkdownInline[][] };

const HEADING = /^(#{1,4})\s+(.+?)\s*#*\s*$/;
const UNORDERED = /^\s{0,3}[-*+]\s+(.*)$/;
const ORDERED = /^\s{0,3}\d{1,9}[.)]\s+(.*)$/;

/** Ob ein Link sicher ist: Web, E-Mail, Pfad oder Anker; nie `javascript:` oder `data:`. */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^(https?:\/\/|mailto:)/i.test(href)) return /[\s<>"]/.test(href) ? null : href;
  if ((href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#")) return /[\s<>"\\]/.test(href) ? null : href;
  return null;
}

function closing(text: string, marker: string, from: number): number {
  const index = text.indexOf(marker, from);
  return index > from ? index : -1;
}

/** Text einer Zeile in Bausteine; ohne Verschachtelung von Links in Links. */
export function parseInline(text: string, allowLinks = true): MarkdownInline[] {
  const out: MarkdownInline[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) out.push({ type: "text", value: buffer });
    buffer = "";
  };
  let index = 0;
  while (index < text.length) {
    const char = text[index] as string;
    const rest = text.slice(index);
    if (char === "\\" && index + 1 < text.length && /[\\`*_[\]()#+\-.!]/.test(text[index + 1] as string)) {
      buffer += text[index + 1];
      index += 2;
      continue;
    }
    if (char === "`") {
      const end = closing(text, "`", index + 1);
      if (end > 0) {
        flush();
        out.push({ type: "code", value: text.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }
    if (rest.startsWith("**") || rest.startsWith("__")) {
      const marker = rest.slice(0, 2);
      const end = closing(text, marker, index + 2);
      if (end > 0) {
        flush();
        out.push({ type: "strong", children: parseInline(text.slice(index + 2, end), allowLinks) });
        index = end + 2;
        continue;
      }
    }
    if (char === "*" || char === "_") {
      const end = closing(text, char, index + 1);
      const inner = end > 0 ? text.slice(index + 1, end) : "";
      if (end > 0 && inner.trim() === inner && inner.length > 0) {
        flush();
        out.push({ type: "em", children: parseInline(inner, allowLinks) });
        index = end + 1;
        continue;
      }
    }
    if (char === "[" && allowLinks) {
      const match = /^\[([^\]]+)\]\(([^()\s]+)\)/.exec(rest);
      if (match) {
        flush();
        const [whole, label, target] = match as unknown as [string, string, string];
        const href = safeHref(target);
        const children = parseInline(label, false);
        if (href) out.push({ type: "link", href, children });
        else out.push(...children);
        index += whole.length;
        continue;
      }
    }
    buffer += char;
    index += 1;
  }
  flush();
  return out;
}

/** Text in Blöcke. Leere Zeilen trennen Absätze und Listen. */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", children: parseInline(paragraph.join(" ")) });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: "list", ordered: list.ordered, items: list.items.map((item) => parseInline(item)) });
    list = null;
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const hashes = (heading[1] as string).length;
      blocks.push({ type: "heading", level: hashes <= 2 ? 2 : hashes === 3 ? 3 : 4, children: parseInline(heading[2] as string) });
      continue;
    }
    const unordered = UNORDERED.exec(line);
    const ordered = unordered ? null : ORDERED.exec(line);
    const item = unordered ?? ordered;
    if (item) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (list && list.ordered !== isOrdered) flushList();
      list ??= { ordered: isOrdered, items: [] };
      list.items.push((item[1] as string).trim());
      continue;
    }
    const current = list as { ordered: boolean; items: string[] } | null;
    if (current && /^\s+\S/.test(raw) && current.items.length) {
      current.items[current.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}

/** Reiner Text ohne Auszeichnung, zum Beispiel für eine Beschreibung. */
export function plainText(blocks: readonly MarkdownBlock[]): string {
  const inline = (nodes: readonly MarkdownInline[]): string => nodes.map((node) => ("value" in node ? node.value : inline(node.children))).join("");
  return blocks.map((block) => (block.type === "list" ? block.items.map(inline).join(" ") : inline(block.children))).join(" ");
}
