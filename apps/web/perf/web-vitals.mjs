/**
 * Labormessung von LCP, CLS und INP (PRD v2 14.6) mit Playwright: je Seite und
 * Gerät mehrere kalte Aufrufe in einem neuen Browser-Kontext, ausgewertet am
 * 75. Perzentil. Für INP wird das erste sichtbare Bedienelement im
 * Hauptbereich angeklickt. Ersetzt keine Felddaten echter Besucher.
 *
 *   AGE_COOKIE=… node perf/web-vitals.mjs https://staging.thegnd.net /de/p/demo-alessia
 *
 * AGE_COOKIE wie bei `suche-last.mjs`. Ohne weitere Pfade: Start, Suche.
 */
import { chromium, devices } from "@playwright/test";

const [base = "http://localhost:3000", ...extra] = process.argv.slice(2);
const age = process.env.AGE_COOKIE ?? "";
const runs = Number(process.env.RUNS ?? 10);
const paths = ["/de", "/de/suche?ort=stadt-zuerich", ...extra];
const profiles = { Desktop: devices["Desktop Chrome"], Handy: devices["Pixel 7"] };

function observe() {
  globalThis.__vitals = { lcp: 0, cls: 0, inp: 0 };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) globalThis.__vitals.lcp = entry.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) globalThis.__vitals.cls += entry.value;
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (entry.interactionId) globalThis.__vitals.inp = Math.max(globalThis.__vitals.inp, entry.duration);
  }).observe({ type: "event", buffered: true, durationThreshold: 16 });
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * (p / 100);
  const low = Math.floor(index);
  const high = Math.min(low + 1, sorted.length - 1);
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

const browser = await chromium.launch();
const { hostname } = new URL(base);
for (const [device, profile] of Object.entries(profiles))
  for (const path of paths) {
    const samples = [];
    for (let i = 0; i < runs; i += 1) {
      const context = await browser.newContext({ ...profile, locale: "de-CH", timezoneId: "Europe/Zurich" });
      await context.addCookies([{ name: "age_ok", value: age, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax", secure: base.startsWith("https") }]);
      await context.addInitScript(observe);
      const page = await context.newPage();
      await page.goto(base + path, { waitUntil: "networkidle" });
      const control = page.locator("main button:visible").first();
      if (await control.count()) {
        await control.click({ timeout: 3000 }).catch(() => undefined);
        await page.waitForTimeout(500);
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      samples.push(await page.evaluate(() => globalThis.__vitals));
      await context.close();
    }
    const lcp = percentile(samples.map((sample) => sample.lcp), 75);
    const cls = percentile(samples.map((sample) => sample.cls), 75);
    const inp = percentile(samples.map((sample) => sample.inp), 75);
    process.stdout.write(`${device.padEnd(8)} ${path.padEnd(30)} LCP ${Math.round(lcp)} ms, CLS ${cls.toFixed(3)}, INP ${Math.round(inp)} ms\n`);
  }
await browser.close();
