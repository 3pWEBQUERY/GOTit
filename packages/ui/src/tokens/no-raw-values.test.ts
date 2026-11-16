import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) && !entry.includes(".test.") ? [path] : [];
  });
}

const files = sourceFiles(join(root, "components")).concat(sourceFiles(join(root, "link")));

/** PRD 5: Komponenten verwenden nur Token-Namen, nie Hex-Werte; PRD 4.3: keine Verläufe. */
describe("Komponenten verwenden nur Tokens", () => {
  it.each(files.map((file) => [relative(root, file), file] as const))("%s", (_name, file) => {
    const source = readFileSync(file, "utf8");
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?![\w-])/);
    expect(source).not.toMatch(/\b(rgb|hsl|oklch)a?\(/);
    expect(source).not.toMatch(/gradient/);
    expect(source).not.toMatch(/\b(bg|text|border)-(white|black|gray|slate|zinc|red|green|blue|violet|purple|pink)\b/);
  });
});
