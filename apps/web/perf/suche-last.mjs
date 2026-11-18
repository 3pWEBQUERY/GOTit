/**
 * Lasttest der Suche (PRD v2 1.14, Ziel aus 14.6: Suchanfragen unter 500 ms
 * serverseitig, 95. Perzentil). Ruft `/de/suche` mit zufälligen Filtern auf und
 * misst die Zeit bis zum ersten Byte und bis zum Ende der gestreamten Antwort,
 * ausserdem `/api/suche/anzahl` (nur die Abfrage, ohne Rendern) und
 * `/api/health` als Grundlinie für den Netzweg.
 *
 * Die Suche ist pro Client-Adresse begrenzt (120 pro Minute, Vorschläge und
 * Anzahl 90 pro Minute). Das Skript bleibt darunter; mehr Last von einer
 * einzigen Adresse misst nur die Begrenzung.
 *
 *   node perf/suche-last.mjs https://staging.thegnd.net
 *
 * Braucht das Cookie der Altersprüfung in AGE_COOKIE (Wert von `age_ok`, zum
 * Beispiel aus den Entwicklerwerkzeugen nach «Alter bestätigen»).
 * Nur gegen Staging oder lokal, nie gegen die Produktion: Die Aufrufe zählen als
 * Sucheinblendungen in der Statistik.
 */
const base = process.argv[2] ?? "http://localhost:3000";
const age = process.env.AGE_COOKIE ?? "";
const regions = ["stadt-zuerich", "stadt-bern", "basel", "stadt-genf", "lausanne"];
const languages = ["de", "fr", "en", "it"];
const texts = ["massage", "abend", "zürich", "entspannung"];
const sorts = ["relevanz", "neu", "preis-auf"];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function searchParams() {
  const params = new URLSearchParams();
  if (Math.random() < 0.6) params.set("ort", pick(regions));
  if (Math.random() < 0.3) params.set("sprache", pick(languages));
  if (Math.random() < 0.3) params.set("preis_max", String(pick([200, 300, 500])));
  if (Math.random() < 0.2) params.set("fotos", "1");
  if (Math.random() < 0.25) params.set("q", pick(texts));
  if (Math.random() < 0.3) params.set("sortierung", pick(sorts));
  if (Math.random() < 0.2) params.set("seite", String(pick([2, 3])));
  return params.toString();
}

async function measure(path) {
  const start = performance.now();
  const response = await fetch(base + path, {
    headers: { cookie: `age_ok=${age}`, "user-agent": "gotit-lasttest" },
  });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let firstByte = null;
  let body = "";
  for (;;) {
    const { done, value } = await reader.read();
    firstByte ??= performance.now() - start;
    if (done) break;
    body += decoder.decode(value, { stream: true });
  }
  return {
    status: response.status,
    firstByte,
    total: performance.now() - start,
    // Gedrosselt rendert die Seite den Fehlerzustand statt der Treffer.
    limited: /<h1[^>]*>Zu viele Suchanfragen/.test(body) || response.status === 429,
    ageGate: response.status === 403 || response.redirected,
  };
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * (p / 100);
  const low = Math.floor(index);
  const high = Math.min(low + 1, sorted.length - 1);
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

function report(label, results) {
  const totals = results.map((result) => result.total);
  const problems = results.filter((result) => result.status !== 200 || result.limited || result.ageGate).length;
  const line = [50, 75, 95].map((p) => `p${p} ${Math.round(percentile(totals, p))} ms`).join(", ");
  process.stdout.write(`${label.padEnd(34)} n=${results.length}, ${line}, max ${Math.round(Math.max(...totals))} ms, Fehler oder gedrosselt: ${problems}\n`);
}

const health = [];
for (let i = 0; i < 30; i += 1) health.push(await measure("/api/health"));
report("Grundlinie /api/health", health);

const sequential = [];
for (let i = 0; i < 100; i += 1) {
  sequential.push(await measure(`/de/suche?${searchParams()}`));
  await sleep(600);
}
report("Suche nacheinander", sequential);
await sleep(61_000);

const burst = [];
for (let round = 0; round < 10; round += 1) {
  burst.push(...(await Promise.all(Array.from({ length: 10 }, () => measure(`/de/suche?${searchParams()}`)))));
  await sleep(6000);
}
report("Suche, je 10 gleichzeitig", burst);
await sleep(61_000);

const count = [];
for (let round = 0; round < 8; round += 1) {
  count.push(...(await Promise.all(Array.from({ length: 10 }, () => measure(`/api/suche/anzahl?${searchParams()}`)))));
  await sleep(7500);
}
report("Anzahl (nur Abfrage), je 10 gleichz.", count);
