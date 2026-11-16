import { config } from "dotenv";
import { getDb } from "../src";
import { InternalRole } from "../src/generated/enums";

config({ path: ["../../.env", ".env"], quiet: true });

/**
 * Vergibt eine interne Rolle an ein bestehendes Konto. Gedacht für die erste
 * Super-Admin-Rolle einer Umgebung (Railway: «railway run» oder Shell des
 * Dienstes `web`). Weitere Rollen vergibt die Admin-Anwendung (Schritt 1.13).
 *
 *   pnpm --filter @app/db grant-role <email> <ROLLE>
 */
const [email, role] = process.argv.slice(2);
const roles = Object.values(InternalRole) as string[];
if (!email || !role || !roles.includes(role)) {
  process.stderr.write(`Aufruf: grant-role <email> <${roles.join("|")}>\n`);
  process.exit(1);
}

const db = getDb();
const user = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, twoFactorEnabled: true } });
if (!user) {
  process.stderr.write("Kein Konto mit dieser Adresse.\n");
  process.exit(1);
}
await db.internalRoleAssignment.upsert({
  where: { userId_role: { userId: user.id, role: role as InternalRole } },
  create: { userId: user.id, role: role as InternalRole, grantedBy: "cli" },
  update: {},
});
await db.auditEvent.create({ data: { action: "internal_role.grant", target: `user:${user.id}`, reason: `${role} per Kommandozeile` } });
process.stdout.write(`Rolle ${role} vergeben.${user.twoFactorEnabled ? "" : " Hinweis: Die Admin-Anwendung verlangt zuerst die Einrichtung von 2FA."}\n`);
await db.$disconnect();
