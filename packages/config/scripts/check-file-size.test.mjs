import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countLines } from "./check-file-size.mjs";

const script = fileURLToPath(new URL("./check-file-size.mjs", import.meta.url));

function repoWith(files) {
  const root = mkdtempSync(join(tmpdir(), "file-size-"));
  for (const [path, lines] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), Array.from({ length: lines }, (_, i) => `// ${i}`).join("\n") + "\n");
  }
  return root;
}

describe("Dateigrössen-Prüfung (PRD 4.1)", () => {
  it("zählt Zeilen ohne die abschliessende Leerzeile", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("a\nb\n")).toBe(2);
    expect(countLines("a\nb")).toBe(2);
  });

  it("lässt eine Datei mit genau 600 Zeilen durch", () => {
    const root = repoWith({ "apps/web/a.ts": 600, "packages/ui/b.css": 12 });
    expect(execFileSync("node", [script, root], { encoding: "utf8" })).toContain("bestanden");
  });

  it.each(["apps/web/a.ts", "apps/web/a.tsx", "packages/ui/a.css", "packages/db/a.prisma", "apps/web/messages/de/a.json"])(
    "schlägt bei 601 Zeilen fehl: %s",
    (path) => {
      const result = spawnSync("node", [script, repoWith({ [path]: 601 })], { encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("601 Zeilen");
    },
  );

  it("nimmt generierte Dateien und Migrationen aus", () => {
    const root = repoWith({ "packages/db/src/generated/client.ts": 5000, "packages/db/prisma/migrations/1/x.json": 900 });
    expect(spawnSync("node", [script, root]).status).toBe(0);
  });

  it("verbietet Sammelbecken-Dateinamen", () => {
    const result = spawnSync("node", [script, repoWith({ "apps/web/lib/utils.ts": 3 })], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Sammelbecken");
  });
});
