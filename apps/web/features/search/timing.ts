/**
 * Messung der Suchdauer (Schritt 1.14, PRD v2 14.6: Suchanfragen unter 500 ms
 * serverseitig am 95. Perzentil). Gemessen wird nur die Dauer des Aufrufs von
 * `searchPort`, ohne Rate Limit, Sitzung und Rendern. Nach aussen geht nur die
 * Zahl, nie ein Suchbegriff oder Filter.
 */
export async function timed<T>(
  run: () => Promise<T>,
): Promise<{ value: T; ms: number }> {
  const start = performance.now();
  const value = await run();
  return { value, ms: performance.now() - start };
}

/** Wert für den Header `Server-Timing`, z. B. `search;dur=12.3`. */
export function searchServerTiming(ms: number): string {
  return `search;dur=${ms.toFixed(1)}`;
}
