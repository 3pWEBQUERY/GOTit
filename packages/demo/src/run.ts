import { config } from "dotenv";
import { checkDemoEnvironment, demoPassword } from "./guard";

/**
 * `pnpm --filter @app/demo seed [--reset] [--reset-only]` (Entscheid 0023).
 * Bricht ausserhalb von Staging und lokaler Entwicklung ab. Gibt die
 * Demo-Logins aus, nie das Passwort.
 */
config({ path: ["../../.env", ".env"], quiet: true });

const out = (line: string) => process.stdout.write(`${line}\n`);
const guard = checkDemoEnvironment(process.env);
if (!guard.ok) {
  process.stderr.write(`Demo-Daten abgebrochen: ${guard.message}\n`);
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const password = demoPassword(process.env);
// Erst nach der Prüfung laden: Ohne erlaubte Umgebung wird nichts verbunden.
const { getDb } = await import("@app/db");
const { resetDemo, seedDemo } = await import("./seed");
const db = getDb();
try {
  if (args.has("--reset") || args.has("--reset-only")) {
    const removed = await resetDemo(db);
    out(`Demo-Daten entfernt: ${removed.users} Konten, ${removed.organizations} Organisationen, ${removed.media} Bilder.`);
  }
  if (!args.has("--reset-only")) {
    out(`Demo-Daten laden (Umgebung: ${guard.environment}) …`);
    // Railway bricht den Pre-Deploy-Befehl nach einer Zeitgrenze ab; Bilder, die nicht mehr Platz haben, folgen beim nächsten Lauf.
    const budget = Number(process.env.DEMO_MEDIA_BUDGET_SECONDS ?? "150");
    const summary = await seedDemo({ password, log: out, mediaBudgetSeconds: Number.isFinite(budget) && budget > 0 ? budget : 150 });
    out(
      `Demo-Daten geladen: ${summary.providers} Profile (${summary.indexed} in der Suche), ${summary.organizations} Organisationen, ${summary.members} Mitglieder, ` +
        `${summary.reviews} Bewertungen, ${summary.openRequests} offene Anfragen, ${summary.conversations} Unterhaltungen, ${summary.statEvents} Statistik-Ereignisse.`,
    );
    out(`Bilder: ${summary.media.processed} verarbeitet, ${summary.media.kept} unverändert, ${summary.media.removed} entfernt.`);
    if (summary.media.pending > 0) out(`Noch ${summary.media.pending} Bilder offen (Zeitgrenze erreicht); sie entstehen beim nächsten Lauf.`);
    if (password) {
      out("Demo-Logins (Passwort aus DEMO_PASSWORD):");
      for (const login of summary.logins) out(`  ${login.email}  ${login.role}`);
    } else {
      out("Ohne DEMO_PASSWORD: Demo-Konten haben kein Passwort und lassen sich nicht anmelden.");
      out(`Logins mit DEMO_PASSWORD: ${summary.logins.map((login) => login.email).join(", ")}`);
    }
  }
} finally {
  await db.$disconnect();
}
