/**
 * Lasttest der Kernfunktion `searchPort.search` / `count` / `suggest` gegen die
 * lokale Datenbank (Schritt 1.14), ohne HTTP und ohne Rate Limit.
 * Aufruf: scripts/load/run.sh core [Clients…]   (Standard: 1 20 50)
 */
import { parseSearchQuery } from "../../packages/core/src/search/query";
import { searchPort } from "../../packages/core/src/search";
import { getDb } from "@app/db";
// @ts-expect-error: reines ESM-Hilfsmodul ohne Typen
import { SCENARIOS, pool, summary } from "./scenarios.mjs";

const context = { viewer: { kind: "visitor" as const }, locale: "de" as const };
const levels = process.argv.slice(2).map(Number).filter((n) => n > 0);
const PER_LEVEL = Number(process.env.LOAD_REQUESTS ?? 1500);
const SUGGEST_TERMS = ["li", "zü", "gen", "lina", "basel", "xyzq", "ma", "ruh"];

type Kind = "search" | "count" | "suggest";
function run(kind: Kind, index: number): Promise<unknown> {
  if (kind === "suggest") return searchPort.suggest(SUGGEST_TERMS[index % SUGGEST_TERMS.length]!, context);
  const scenario = SCENARIOS[index % SCENARIOS.length];
  const query = parseSearchQuery(Object.fromEntries(new URLSearchParams(scenario.params)));
  return kind === "search" ? searchPort.search(query, context) : searchPort.count(query, context);
}

const fmt = (s: ReturnType<typeof summary>) =>
  `n=${s.n} p50=${s.p50.toFixed(1)} p95=${s.p95.toFixed(1)} p99=${s.p99.toFixed(1)} max=${s.max.toFixed(1)}`;

async function main() {
  // Aufwärmen: Verbindungen und Planner-Caches.
  for (let i = 0; i < SCENARIOS.length; i++) await run("search", i);
  const result: Record<string, unknown> = {};
  for (const concurrency of levels.length > 0 ? levels : [1, 20, 50]) {
    for (const kind of ["search", "count", "suggest"] as Kind[]) {
      const all: number[] = [];
      const perScenario = new Map<string, number[]>();
      const start = performance.now();
      await pool(PER_LEVEL, concurrency, async (index: number) => {
        const t = performance.now();
        await run(kind, index);
        const ms = performance.now() - t;
        all.push(ms);
        const name = kind === "suggest" ? `suggest:${SUGGEST_TERMS[index % SUGGEST_TERMS.length]}` : SCENARIOS[index % SCENARIOS.length].name;
        perScenario.set(name, [...(perScenario.get(name) ?? []), ms]);
      });
      const seconds = (performance.now() - start) / 1000;
      const total = summary(all);
      console.log(`${kind} c=${concurrency} ${fmt(total)} throughput=${(PER_LEVEL / seconds).toFixed(0)}/s`);
      const rows = [...perScenario].map(([name, values]) => ({ name, ...summary(values) }));
      rows.sort((a, b) => b.p95 - a.p95);
      for (const row of rows.slice(0, 5)) console.log(`   ${row.name.padEnd(22)} ${fmt(row)}`);
      result[`${kind}-c${concurrency}`] = { ...total, throughput: PER_LEVEL / seconds, scenarios: rows };
    }
  }
  if (process.env.LOAD_JSON) (await import("node:fs")).writeFileSync(process.env.LOAD_JSON, JSON.stringify(result, null, 2));
  await getDb().$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
