// Filterkombinationen für den Lasttest (Schritt 1.14), als URL-Parameter wie in /suche.
// Dieselbe Liste nutzen bench-core.ts (Kernfunktion) und bench-http.mjs (HTTP-Route).
export const SCENARIOS = [
  { name: "ohne-filter", params: "" },
  { name: "kanton", params: "ort=zuerich" },
  { name: "stadt-umkreis-50", params: "ort=stadt-zuerich&umkreis=50" },
  { name: "region-sprache", params: "ort=genf&sprache=fr" },
  { name: "sprachen", params: "sprache=de,en" },
  { name: "preis", params: "preis_min=200&preis_max=400" },
  { name: "kategorie", params: "kategorie=load-kategorie-3" },
  { name: "text-name", params: "q=lina" },
  { name: "text-praefix", params: "q=z%C3%BCr" },
  { name: "text-tippfehler", params: "q=linna" },
  { name: "text-zwei-woerter", params: "q=ruhig+abend" },
  { name: "sort-preis", params: "ort=zuerich&sortierung=preis" },
  { name: "sort-neu-fotos", params: "sortierung=neu&fotos=1" },
  { name: "bewertungen-neu", params: "bewertungen=1&neu=1" },
  { name: "seite-20", params: "seite=20" },
  { name: "text-seite-5", params: "q=a&seite=5" },
  { name: "kombi", params: "ort=zuerich&sprache=de&kategorie=load-kategorie-2&preis_max=600&fotos=1&q=ruhig" },
  { name: "null-treffer", params: "ort=bern&sprache=ru&kategorie=load-kategorie-1&preis_max=110&bewertungen=1" },
];

export function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

export function summary(values) {
  return {
    n: values.length,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
    max: Math.max(...values),
  };
}

/** Führt `total` Aufgaben mit höchstens `concurrency` gleichzeitig aus. */
export async function pool(total, concurrency, task) {
  let next = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (next < total) await task(next++);
  });
  await Promise.all(workers);
}
