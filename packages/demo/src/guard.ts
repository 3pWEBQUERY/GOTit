/**
 * Wo die Demo-Daten laden dürfen (Entscheid 0023). Erlaubt sind
 * `APP_ENV=staging`, `development` und `test` sowie eine lokale Umgebung ohne
 * `APP_ENV`, solange `NODE_ENV` nicht `production` ist. Die Produktion nur mit
 * der zusätzlichen Freigabe `DEMO_ALLOW_PRODUCTION=1` (Entscheid der
 * Betreiberin vom 18.11.2026, für die Zeit vor dem Start); dort gibt es nie
 * eine Anmeldung. Alles andere, auch ein unbekannter Wert, bricht ab.
 */
const ALLOWED = new Set(["staging", "development", "test"]);

export type GuardResult = { ok: true; environment: string } | { ok: false; message: string };

export function checkDemoEnvironment(env: Record<string, string | undefined>): GuardResult {
  const appEnv = env.APP_ENV?.trim() ?? "";
  if (appEnv === "production") {
    if (env.DEMO_ALLOW_PRODUCTION === "1") return { ok: true, environment: "production" };
    return { ok: false, message: "Demo-Daten in der Produktion nur mit DEMO_ALLOW_PRODUCTION=1 (APP_ENV=production)." };
  }
  if (appEnv === "") {
    if (env.NODE_ENV === "production") return { ok: false, message: "NODE_ENV=production ohne APP_ENV: Demo-Daten nur mit APP_ENV=staging, development oder test." };
    return { ok: true, environment: "lokal" };
  }
  if (!ALLOWED.has(appEnv)) return { ok: false, message: `Unbekannte Umgebung APP_ENV=${appEnv}: Demo-Daten nur mit APP_ENV=staging, development oder test.` };
  return { ok: true, environment: appEnv };
}

/** Mindestlänge von `DEMO_PASSWORD`. */
export const DEMO_PASSWORD_MIN = 12;

/**
 * Passwort der Demo-Konten: null ohne `DEMO_PASSWORD` (dann ohne Anmeldung);
 * zu kurz bricht ab. In der Produktion immer null: Dort sind Demo-Konten nie
 * anmeldbar, auch wenn jemand `DEMO_PASSWORD` setzt.
 */
export function demoPassword(env: Record<string, string | undefined>): string | null {
  if (env.APP_ENV?.trim() === "production") return null;
  const value = env.DEMO_PASSWORD ?? "";
  if (value === "") return null;
  if (value.length < DEMO_PASSWORD_MIN) throw new Error(`DEMO_PASSWORD muss mindestens ${DEMO_PASSWORD_MIN} Zeichen lang sein.`);
  return value;
}
