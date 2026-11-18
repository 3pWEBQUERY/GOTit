/**
 * Lasttest der HTTP-Routen der Suche gegen einen LOKALEN Produktions-Build
 * (Schritt 1.14). Nie gegen Staging oder Produktion richten.
 *
 *   node scripts/load/bench-http.mjs http://localhost:3360 [Clients…]
 *
 * Ohne Clients: im Rate Limit (eine Adresse, 1.5 Anfragen/s für /de/suche,
 * 1 Anfrage/s für die API-Routen). Mit Clients (z. B. 20 50): parallel, jede
 * Anfrage mit eigener `x-real-ip`, damit das Limit pro Adresse nicht greift.
 * Das geht nur lokal: Auf Railway setzt der Rand des Netzes `x-real-ip`.
 */
import { createHmac } from "node:crypto";
import { SCENARIOS, pool, summary } from "./scenarios.mjs";

const base = process.argv[2];
const levels = process.argv.slice(3).map(Number).filter((n) => n > 0);
if (!base || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error("Nur gegen localhost: node bench-http.mjs http://localhost:3360 [Clients…]");
  process.exit(1);
}
const secret = process.env.AGE_GATE_SECRET;
if (!secret) throw new Error("AGE_GATE_SECRET fehlt (.env laden).");
const issuedAt = String(Date.now());
const cookie = `age_ok=${issuedAt}.${createHmac("sha256", secret).update(`age:${issuedAt}`).digest("base64url")}`;
const SUGGEST = ["li", "z%C3%BC", "gen", "lina", "basel", "xyzq", "ma", "ruh"];

const routes = {
  page: (i) => `/de/suche?${SCENARIOS[i % SCENARIOS.length].params}`,
  anzahl: (i) => `/api/suche/anzahl?${SCENARIOS[i % SCENARIOS.length].params}`,
  vorschlaege: (i) => `/api/suche/vorschlaege?q=${SUGGEST[i % SUGGEST.length]}`,
};

let ipCounter = 0;
async function hit(path, rotateIp) {
  const headers = { cookie };
  headers["x-real-ip"] = rotateIp ? `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter++ & 255}` : "10.255.255.1";
  const start = performance.now();
  const response = await fetch(base + path, { headers });
  const ttfb = performance.now() - start;
  const body = await response.text();
  const total = performance.now() - start;
  const timing = /search;dur=([\d.]+)/.exec(response.headers.get("server-timing") ?? "");
  // Die Suchseite antwortet auch limitiert mit 200; dort zählt das Log `search.timing` (fehlt bei Limit).
  const limited = response.status === 429;
  return { status: response.status, ttfb, total, server: timing ? Number(timing[1]) : null, limited };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fmt = (s) => `n=${s.n} p50=${s.p50.toFixed(1)} p95=${s.p95.toFixed(1)} p99=${s.p99.toFixed(1)} max=${s.max.toFixed(1)}`;

function report(label, results, seconds) {
  const ok = results.filter((r) => r.status === 200);
  const server = ok.map((r) => r.server).filter((v) => v !== null);
  console.log(`${label}: ${ok.length}/${results.length} ok, ${results.filter((r) => r.limited).length} limitiert, ${(results.length / seconds).toFixed(1)}/s`);
  console.log(`   TTFB   ${fmt(summary(ok.map((r) => r.ttfb)))}`);
  console.log(`   gesamt ${fmt(summary(ok.map((r) => r.total)))}`);
  if (server.length > 0) console.log(`   Server-Timing search ${fmt(summary(server))}`);
}

// Aufwärmen (JIT, Verbindungen), mit eigenen Adressen.
for (let i = 0; i < SCENARIOS.length; i++) await hit(routes.page(i), true);

if (levels.length === 0) {
  for (const [name, path, perSecond, count] of [
    ["page", routes.page, 1.5, 90],
    ["anzahl", routes.anzahl, 1, 72],
    ["vorschlaege", routes.vorschlaege, 1, 64],
  ]) {
    const results = [];
    const start = performance.now();
    for (let i = 0; i < count; i++) {
      const t = performance.now();
      results.push(await hit(path(i), false));
      await wait(Math.max(0, 1000 / perSecond - (performance.now() - t)));
    }
    report(`${name} im Limit (eine Adresse)`, results, (performance.now() - start) / 1000);
  }
} else {
  for (const concurrency of levels)
    for (const [name, path] of Object.entries(routes)) {
      const total = Number(process.env.LOAD_REQUESTS ?? 600);
      const results = [];
      const start = performance.now();
      await pool(total, concurrency, async (i) => results.push(await hit(path(i), true)));
      report(`${name} c=${concurrency}`, results, (performance.now() - start) / 1000);
    }
}
