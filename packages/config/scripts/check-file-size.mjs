#!/usr/bin/env node
// CI-Schritt aus PRD 4.1: zählt alle .ts, .tsx, .css, .prisma und .json unter
// apps/ und packages/ und bricht ab 601 Zeilen ab. Zusätzlich verbietet er die
// Sammelbecken-Dateinamen aus 4.1 (utils.ts, part1.tsx).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";

export const HARD_LIMIT = 600;
const EXTENSIONS = [".ts", ".tsx", ".css", ".prisma", ".json"];
const SKIPPED_DIRS = new Set(["node_modules", ".next", "dist", ".turbo", "generated", "migrations", "test-results", "playwright-report", "coverage"]);
const SKIPPED_FILES = new Set(["pnpm-lock.yaml", "package-lock.json", "next-env.d.ts"]);
const FORBIDDEN_NAMES = [/^utils\.tsx?$/, /^helpers\.tsx?$/, /^part\d+\.tsx?$/];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry)) yield* walk(path);
    } else if (!SKIPPED_FILES.has(entry) && EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      yield path;
    }
  }
}

export function countLines(text) {
  if (text.length === 0) return 0;
  const lines = text.split("\n").length;
  return text.endsWith("\n") ? lines - 1 : lines;
}

export function checkFileSizes(root) {
  const problems = [];
  let checked = 0;
  for (const top of ["apps", "packages"]) {
    let files;
    try {
      files = [...walk(join(root, top))];
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const file of files) {
      checked += 1;
      const path = relative(root, file);
      const lines = countLines(readFileSync(file, "utf8"));
      if (lines > HARD_LIMIT) problems.push(`${path}: ${lines} Zeilen (Grenze ${HARD_LIMIT})`);
      if (FORBIDDEN_NAMES.some((pattern) => pattern.test(basename(file)))) {
        problems.push(`${path}: Sammelbecken-Dateiname, nach Verantwortung benennen`);
      }
    }
  }
  return { checked, problems };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] ?? process.cwd();
  const { checked, problems } = checkFileSizes(root);
  if (problems.length > 0) {
    process.stderr.write(`Dateigrössen-Prüfung fehlgeschlagen:\n${problems.map((p) => `  ${p}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`Dateigrössen-Prüfung bestanden: ${checked} Dateien, keine über ${HARD_LIMIT} Zeilen.\n`);
}
