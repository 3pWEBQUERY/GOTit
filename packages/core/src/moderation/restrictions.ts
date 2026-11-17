import { getDb, type Prisma, type ProviderStatus, type RestrictionKind } from "@app/db";
import { z } from "zod";
import { assertPermission } from "../admin/permissions";
import { revokeCachedSessions } from "../account/revoke-sessions";
import { requestSearchReindex } from "../search/reindex";
import { MODERATION_RULE_KEYS } from "./rules";

/**
 * Einschränkungen und Sperren von Konten (v1 9.2): mit Regel, Grund,
 * optionalem Ende und Einspruch. Eine Sperre (`SUSPENDED`) beendet alle
 * Sitzungen, verhindert die Anmeldung und nimmt das Anbieterprofil aus der
 * Öffentlichkeit. Jede Änderung schreibt einen Audit-Eintrag (v1 9.7).
 */
export const restrictionInputSchema = z.object({
  userId: z.string().min(1).max(64),
  kind: z.enum(["MESSAGING", "BOOKING", "SUSPENDED"]),
  rule: z.enum(MODERATION_RULE_KEYS),
  reason: z.string().trim().min(10).max(1000),
  // Ohne Ende gilt sie, bis jemand sie aufhebt.
  until: z.coerce.date().nullable().default(null),
  reportId: z.string().min(1).max(64).nullable().default(null),
});
export type RestrictionInput = z.input<typeof restrictionInputSchema>;

export const liftReasonSchema = z.string().trim().min(10).max(1000);
export const appealReasonSchema = z.string().trim().min(20).max(2000);

export type RestrictionResult =
  | { ok: true; restrictionId: string }
  | { ok: false; reason: "invalid" | "not-found" | "self" | "protected" | "already-active" | "past-end" };

type Tx = Prisma.TransactionClient;

/** Gilt die Einschränkung gerade? Aufgehoben oder abgelaufen: nein. */
function activeWhere(now: Date): Prisma.AccountRestrictionWhereInput {
  return { liftedAt: null, OR: [{ until: null }, { until: { gt: now } }] };
}

/** Aktive Arten eines Kontos. Eine Sperre schliesst alle anderen ein. */
export async function activeRestrictionKinds(userId: string, now = new Date()): Promise<Set<RestrictionKind>> {
  const rows = await getDb().accountRestriction.findMany({ where: { userId, ...activeWhere(now) }, select: { kind: true } });
  const kinds = new Set(rows.map((row) => row.kind));
  if (kinds.has("SUSPENDED")) {
    kinds.add("MESSAGING");
    kinds.add("BOOKING");
  }
  return kinds;
}

export async function isRestricted(userId: string, kind: RestrictionKind): Promise<boolean> {
  return (await activeRestrictionKinds(userId)).has(kind);
}

/** Profil aus der Öffentlichkeit nehmen und den vorherigen Status merken. */
async function suspendProfile(tx: Tx, userId: string) {
  const profile = await tx.providerProfile.findUnique({ where: { userId }, select: { id: true, status: true } });
  if (!profile) return { profileId: null, previous: null };
  if (profile.status !== "SUSPENDED") await tx.providerProfile.update({ where: { id: profile.id }, data: { status: "SUSPENDED" } });
  return { profileId: profile.id, previous: profile.status };
}

/**
 * Legt eine Einschränkung an. Für `SUSPENDED` braucht es `users.suspend`,
 * sonst `users.restrict`. Konten mit interner Rolle schützt nur `SUPER_ADMIN`
 * nicht; niemand schränkt sich selbst ein.
 */
export async function restrictAccount(actorId: string, input: RestrictionInput, now = new Date()): Promise<RestrictionResult> {
  const parsed = restrictionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const data = parsed.data;
  const actor = await assertPermission(actorId, data.kind === "SUSPENDED" ? "users.suspend" : "users.restrict");
  if (data.userId === actorId) return { ok: false, reason: "self" };
  if (data.until && data.until <= now) return { ok: false, reason: "past-end" };
  const db = getDb();
  const target = await db.user.findUnique({ where: { id: data.userId }, select: { id: true, internalRoles: { select: { role: true } } } });
  if (!target) return { ok: false, reason: "not-found" };
  if (target.internalRoles.length > 0 && !actor.roles.includes("SUPER_ADMIN")) return { ok: false, reason: "protected" };

  let revokedTokens: string[] | null = null;
  const result = await db.$transaction(async (tx) => {
    // Sperre pro Konto serialisieren, damit zwei gleichzeitige Entscheide nicht zwei aktive Zeilen ergeben.
    await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${data.userId} FOR UPDATE`;
    const existing = await tx.accountRestriction.count({ where: { userId: data.userId, kind: data.kind, ...activeWhere(now) } });
    if (existing > 0) return null;
    let previousProfileStatus: ProviderStatus | null = null;
    let profileId: string | null = null;
    if (data.kind === "SUSPENDED") {
      const suspended = await suspendProfile(tx, data.userId);
      profileId = suspended.profileId;
      // Eine abgelaufene, vom Cron-Dienst noch nicht aufgehobene Sperre gibt ihren gemerkten Status weiter.
      const running = await tx.accountRestriction.findFirst({
        where: { userId: data.userId, kind: "SUSPENDED", liftedAt: null },
        orderBy: { createdAt: "desc" },
        select: { previousProfileStatus: true },
      });
      previousProfileStatus = running ? running.previousProfileStatus : suspended.previous;
      const sessions = await tx.session.findMany({ where: { userId: data.userId }, select: { token: true } });
      revokedTokens = sessions.map((session) => session.token);
      await tx.session.deleteMany({ where: { userId: data.userId } });
    }
    const restriction = await tx.accountRestriction.create({
      data: {
        userId: data.userId,
        kind: data.kind,
        rule: data.rule,
        reason: data.reason,
        until: data.until,
        reportId: data.reportId,
        createdById: actorId,
        previousProfileStatus,
      },
      select: { id: true },
    });
    await tx.auditEvent.create({
      data: { actorId, action: `account.restricted.${data.kind.toLowerCase()}`, target: `user:${data.userId}`, reason: `${data.rule}: ${data.reason}` },
    });
    return { restrictionId: restriction.id, profileId };
  });
  if (!result) return { ok: false, reason: "already-active" };
  if (revokedTokens) await revokeCachedSessions(data.userId, revokedTokens);
  if (result.profileId) await requestSearchReindex(result.profileId);
  return { ok: true, restrictionId: result.restrictionId };
}

/**
 * Hebt eine Einschränkung auf (Entscheid, Einspruch oder Ablauf). Bei einer
 * Sperre kehrt das Profil zum gemerkten Status zurück, sofern keine weitere
 * Sperre aktiv ist. `actorId` null: Ablauf durch den Cron-Dienst.
 */
async function lift(restrictionId: string, actorId: string | null, reason: string, now: Date): Promise<boolean> {
  const db = getDb();
  const outcome = await db.$transaction(async (tx) => {
    const lifted = await tx.accountRestriction.updateMany({
      where: { id: restrictionId, liftedAt: null },
      data: { liftedAt: now, liftedById: actorId, liftReason: reason },
    });
    if (lifted.count === 0) return null;
    const row = await tx.accountRestriction.findUniqueOrThrow({ where: { id: restrictionId }, select: { userId: true, kind: true, previousProfileStatus: true } });
    let profileId: string | null = null;
    if (row.kind === "SUSPENDED") {
      const stillSuspended = await tx.accountRestriction.findFirst({
        where: { userId: row.userId, kind: "SUSPENDED", ...activeWhere(now) },
        select: { id: true },
      });
      if (!stillSuspended && row.previousProfileStatus) {
        const profile = await tx.providerProfile.findUnique({ where: { userId: row.userId }, select: { id: true, status: true } });
        if (profile && profile.status === "SUSPENDED") {
          await tx.providerProfile.update({ where: { id: profile.id }, data: { status: row.previousProfileStatus } });
          profileId = profile.id;
        }
      }
    }
    await tx.auditEvent.create({
      data: { actorId, action: `account.restriction_lifted.${row.kind.toLowerCase()}`, target: `user:${row.userId}`, reason },
    });
    return { profileId };
  });
  if (!outcome) return false;
  if (outcome.profileId) await requestSearchReindex(outcome.profileId);
  return true;
}

export async function liftRestriction(actorId: string, restrictionId: string, reason: string, now = new Date()): Promise<{ ok: boolean; reason?: "invalid" | "not-found" }> {
  const parsedReason = liftReasonSchema.safeParse(reason);
  if (!parsedReason.success || restrictionId.length > 64) return { ok: false, reason: "invalid" };
  const row = await getDb().accountRestriction.findUnique({ where: { id: restrictionId }, select: { kind: true } });
  if (!row) {
    await assertPermission(actorId, "users.restrict");
    return { ok: false, reason: "not-found" };
  }
  await assertPermission(actorId, row.kind === "SUSPENDED" ? "users.suspend" : "users.restrict");
  return (await lift(restrictionId, actorId, parsedReason.data, now)) ? { ok: true } : { ok: false, reason: "not-found" };
}

/** Einschränkungen eines Falls aufheben, nach einem stattgegebenen Einspruch gegen den Fall. */
export async function liftRestrictionsOfReport(actorId: string, reportId: string, reason: string, now = new Date()): Promise<number> {
  const rows = await getDb().accountRestriction.findMany({ where: { reportId, liftedAt: null }, select: { id: true } });
  let count = 0;
  for (const row of rows) if (await lift(row.id, actorId, reason, now)) count += 1;
  return count;
}

/** Abgelaufene Einschränkungen aufheben (Cron `purge-expired`). Gibt die Zahl zurück. */
export async function expireRestrictions(now = new Date()): Promise<number> {
  const due = await getDb().accountRestriction.findMany({
    where: { liftedAt: null, until: { lte: now } },
    select: { id: true },
    take: 500,
  });
  let count = 0;
  for (const row of due) if (await lift(row.id, null, "Befristung abgelaufen", now)) count += 1;
  return count;
}

export interface OwnRestriction {
  id: string;
  kind: RestrictionKind;
  rule: string;
  reason: string;
  until: Date | null;
  createdAt: Date;
  appealStatus: "NONE" | "OPEN" | "UPHELD" | "DISMISSED";
}

/** Aktive Einschränkungen des eigenen Kontos, für die Einstellungen. */
export async function listOwnRestrictions(userId: string, now = new Date()): Promise<OwnRestriction[]> {
  return getDb().accountRestriction.findMany({
    where: { userId, ...activeWhere(now) },
    orderBy: { createdAt: "desc" },
    select: { id: true, kind: true, rule: true, reason: true, until: true, createdAt: true, appealStatus: true },
  });
}

/** Einspruch des betroffenen Kontos, einmal pro Einschränkung. */
export async function appealRestriction(userId: string, restrictionId: string, reason: string, now = new Date()): Promise<{ ok: boolean; reason?: "invalid" | "not-found" | "already" }> {
  const parsedReason = appealReasonSchema.safeParse(reason);
  if (!parsedReason.success || restrictionId.length > 64) return { ok: false, reason: "invalid" };
  const db = getDb();
  const row = await db.accountRestriction.findFirst({ where: { id: restrictionId, userId, ...activeWhere(now) }, select: { appealStatus: true } });
  if (!row) return { ok: false, reason: "not-found" };
  const updated = await db.accountRestriction.updateMany({
    where: { id: restrictionId, userId, appealStatus: "NONE" },
    data: { appealStatus: "OPEN", appealReason: parsedReason.data, appealedAt: now },
  });
  if (updated.count === 0) return { ok: false, reason: "already" };
  await db.auditEvent.create({ data: { actorId: userId, action: "account.restriction_appealed", target: `restriction:${restrictionId}` } });
  return { ok: true };
}

/**
 * Entscheid über einen Einspruch. Nicht durch die Person, die die
 * Einschränkung verhängt hat (Vier-Augen-Prinzip), ausser `SUPER_ADMIN`.
 * `UPHELD` gibt dem Einspruch statt und hebt die Einschränkung auf.
 */
export async function decideRestrictionAppeal(
  actorId: string,
  restrictionId: string,
  input: { outcome: "UPHELD" | "DISMISSED"; reason: string },
  now = new Date(),
): Promise<{ ok: boolean; reason?: "invalid" | "not-found" | "same-person" }> {
  const parsedReason = liftReasonSchema.safeParse(input.reason);
  if (!parsedReason.success || !["UPHELD", "DISMISSED"].includes(input.outcome)) return { ok: false, reason: "invalid" };
  const db = getDb();
  const row = await db.accountRestriction.findUnique({ where: { id: restrictionId }, select: { kind: true, createdById: true, appealStatus: true } });
  const actor = await assertPermission(actorId, row?.kind === "SUSPENDED" ? "users.suspend" : "users.restrict");
  if (!row || row.appealStatus !== "OPEN") return { ok: false, reason: "not-found" };
  if (row.createdById === actorId && !actor.roles.includes("SUPER_ADMIN")) return { ok: false, reason: "same-person" };
  const updated = await db.accountRestriction.updateMany({ where: { id: restrictionId, appealStatus: "OPEN" }, data: { appealStatus: input.outcome } });
  if (updated.count === 0) return { ok: false, reason: "not-found" };
  await db.auditEvent.create({
    data: { actorId, action: `account.restriction_appeal_${input.outcome.toLowerCase()}`, target: `restriction:${restrictionId}`, reason: parsedReason.data },
  });
  if (input.outcome === "UPHELD") await lift(restrictionId, actorId, `Einspruch: ${parsedReason.data}`, now);
  return { ok: true };
}

/** Offene Einsprüche gegen Einschränkungen, älteste zuerst. */
export async function listRestrictionAppeals(actorId: string) {
  await assertPermission(actorId, "users.restrict");
  return getDb().accountRestriction.findMany({
    where: { appealStatus: "OPEN" },
    orderBy: { appealedAt: "asc" },
    take: 200,
    select: { id: true, userId: true, kind: true, rule: true, reason: true, appealReason: true, until: true, appealedAt: true, createdById: true, user: { select: { username: true } } },
  });
}
