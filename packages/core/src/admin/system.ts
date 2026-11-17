import { getDb, type Prisma } from "@app/db";
import { createRedisConnection, jobDefinitions } from "@app/jobs";
import type { Redis } from "ioredis";
import { z } from "zod";
import { FEATURE_KEYS } from "../flags/policy";
import { assertPermission } from "./permissions";

/**
 * System (v2 7.8 `/admin/system`, v1 9.6): Feature Flags, Audit-Log und
 * Zustand der Dienste. Das Lesen des Audit-Logs schreibt selbst keinen
 * Eintrag; jede Änderung eines Flags schon.
 */

const reasonSchema = z.string().trim().min(10).max(500);

export async function listFeatureFlags(actorId: string) {
  await assertPermission(actorId, "flags.manage");
  const rows = await getDb().featureFlag.findMany({ where: { key: { in: [...FEATURE_KEYS] } } });
  // Ein fehlendes Flag gilt als aus (flags/policy).
  return FEATURE_KEYS.map((key) => {
    const row = rows.find((entry) => entry.key === key);
    return { key, enabled: row?.enabled ?? false, disabledRegions: row?.disabledRegions ?? [], updatedAt: row?.updatedAt ?? null };
  });
}

const flagSchema = z.object({
  enabled: z.boolean(),
  disabledRegions: z.array(z.string().min(1).max(80)).max(100),
});

export type SetFlagResult = { ok: true } | { ok: false; reason: "invalid" | "unknown-key" | "unknown-region" };

export async function setFeatureFlag(actorId: string, key: string, input: z.input<typeof flagSchema>, reason: string): Promise<SetFlagResult> {
  await assertPermission(actorId, "flags.manage");
  const parsed = flagSchema.safeParse(input);
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsed.success || !parsedReason.success) return { ok: false, reason: "invalid" };
  if (!(FEATURE_KEYS as readonly string[]).includes(key)) return { ok: false, reason: "unknown-key" };
  const regions = [...new Set(parsed.data.disabledRegions)].sort();
  const db = getDb();
  const known = await db.region.count({ where: { slug: { in: regions } } });
  if (known !== regions.length) return { ok: false, reason: "unknown-region" };
  const data = { enabled: parsed.data.enabled, disabledRegions: regions };
  await db.$transaction([
    db.featureFlag.upsert({ where: { key }, create: { key, ...data }, update: data }),
    db.auditEvent.create({
      data: {
        actorId,
        action: "flag.changed",
        target: `flag:${key}`,
        reason: `${parsedReason.data} (${data.enabled ? "an" : "aus"}; abgeschaltet in: ${regions.join(",") || "keiner Region"})`,
      },
    }),
  ]);
  return { ok: true };
}

export const AUDIT_PAGE_SIZE = 100;

export const auditFilterSchema = z.object({
  actorId: z.string().min(1).max(64).optional(),
  action: z.string().trim().min(1).max(100).optional(),
  target: z.string().trim().min(1).max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  // «<Millisekunden>:<id>» des letzten Eintrags der vorherigen Seite.
  cursor: z.string().regex(/^\d{1,16}:[A-Za-z0-9_-]{1,64}$/).optional(),
});
export type AuditFilter = z.input<typeof auditFilterSchema>;

/** Audit-Log, neueste zuerst, 100 pro Seite; `action` und `target` filtern nach Präfix. */
export async function listAuditEvents(actorId: string, filter: AuditFilter = {}) {
  await assertPermission(actorId, "audit.view");
  const parsed = auditFilterSchema.safeParse(filter);
  if (!parsed.success) return { events: [], nextCursor: null };
  const data = parsed.data;
  const where: Prisma.AuditEventWhereInput[] = [];
  if (data.actorId) where.push({ actorId: data.actorId });
  if (data.action) where.push({ action: { startsWith: data.action } });
  if (data.target) where.push({ target: { startsWith: data.target } });
  if (data.from) where.push({ createdAt: { gte: data.from } });
  if (data.to) where.push({ createdAt: { lte: data.to } });
  if (data.cursor) {
    const [ms, id] = data.cursor.split(":") as [string, string];
    const at = new Date(Number(ms));
    where.push({ OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: id } }] });
  }
  const db = getDb();
  const rows = await db.auditEvent.findMany({ where: { AND: where }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: AUDIT_PAGE_SIZE + 1 });
  const page = rows.slice(0, AUDIT_PAGE_SIZE);
  const actorIds = [...new Set(page.map((row) => row.actorId).filter((id): id is string => Boolean(id)))];
  const actors = actorIds.length ? await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, username: true } }) : [];
  const usernames = new Map(actors.map((actor) => [actor.id, actor.username]));
  const last = page.at(-1);
  return {
    events: page.map((row) => ({
      ...row,
      // Ohne Konto (Cron-Dienst) oder ohne Benutzernamen: null; die Oberfläche zeigt dann die ID oder «System».
      actorUsername: row.actorId ? (usernames.get(row.actorId) ?? null) : null,
    })),
    nextCursor: rows.length > AUDIT_PAGE_SIZE && last ? `${last.createdAt.getTime()}:${last.id}` : null,
  };
}

export interface ServiceCheck {
  ok: boolean;
  latencyMs?: number;
  detail?: string;
}

const CHECK_TIMEOUT_MS = 2000;

async function timed<T>(work: () => Promise<T>): Promise<{ value: T; latencyMs: number }> {
  const started = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), CHECK_TIMEOUT_MS);
  });
  try {
    const value = await Promise.race([work(), timeout]);
    return { value, latencyMs: Math.round(performance.now() - started) };
  } finally {
    clearTimeout(timer);
  }
}

const failure = (error: unknown): ServiceCheck => ({ ok: false, detail: error instanceof Error && error.message === "timeout" ? "Zeitüberschreitung" : "nicht erreichbar" });

// Eine Verbindung für alle Statusabfragen; sie bleibt offen und wird wiederverwendet.
let redis: Redis | null = null;

function statusRedis(): Redis {
  if (!redis) {
    redis = createRedisConnection();
    // Fehler erscheinen im Ergebnis der Prüfung, nicht als unbehandeltes Ereignis.
    redis.on("error", () => undefined);
  }
  return redis;
}

/** Schliesst die Verbindung der Statusabfragen (Tests, Herunterfahren). */
export async function closeServiceStatusConnection(): Promise<void> {
  const client = redis;
  redis = null;
  if (client) client.disconnect();
}

/**
 * Zähler einer Queue direkt aus Redis. Der Kern hängt nicht von BullMQ ab;
 * gelesen wird das Schlüsselschema von BullMQ mit dem Standardpräfix «bull»
 * (wie `enqueue` in @app/jobs): `wait`, `paused` und `prioritized` ergeben
 * «wartend», wie `Queue.getWaitingCount` zusammen mit den priorisierten Jobs.
 */
async function queueCounts(client: Redis, queue: string) {
  const key = (state: string) => `bull:${queue}:${state}`;
  const results = await client
    .multi()
    .llen(key("wait"))
    .llen(key("paused"))
    .zcard(key("prioritized"))
    .llen(key("active"))
    .zcard(key("failed"))
    .zcard(key("delayed"))
    .exec();
  if (!results || results.some(([error]) => error)) throw new Error("redis");
  const [wait, paused, prioritized, active, failed, delayed] = results.map(([, value]) => Number(value ?? 0)) as [number, number, number, number, number, number];
  return { waiting: wait + paused + prioritized, active, failed, delayed };
}

/**
 * Zustand der Dienste für `/admin/system`. Jede Prüfung hat ein Zeitlimit von
 * etwa 2 Sekunden und wirft nicht; ein Fehler erscheint als `ok: false`.
 */
export async function getServiceStatus(actorId: string) {
  await assertPermission(actorId, "system.status");
  const db = getDb();

  const postgres: Promise<ServiceCheck> = timed(() => db.$queryRaw`SELECT 1`)
    .then(({ latencyMs }) => ({ ok: true, latencyMs }))
    .catch(failure);

  const migrations = timed(
    () => db.$queryRaw<{ count: number; last: string | null }[]>`
      SELECT count(*)::int AS count, max(migration_name) AS last
      FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
  )
    .then(({ value }) => ({ ok: true, applied: value[0]?.count ?? 0, last: value[0]?.last ?? null }))
    .catch((error: unknown) => ({ ...failure(error), applied: null, last: null }));

  let client: Redis | null = null;
  let redisCheck: ServiceCheck;
  try {
    client = statusRedis();
    const connected = client;
    redisCheck = await timed(() => connected.ping()).then(({ latencyMs }) => ({ ok: true, latencyMs }));
  } catch (error) {
    redisCheck = error instanceof Error && error.message.includes("REDIS_URL") ? { ok: false, detail: "REDIS_URL fehlt" } : failure(error);
  }

  const names = [...new Set(jobDefinitions.map((definition) => definition.queue))];
  const queues = await Promise.all(
    names.map(async (name) => {
      if (!client || !redisCheck.ok) return { name, ok: false, detail: "Redis nicht erreichbar", counts: null };
      const connected = client;
      try {
        const { value, latencyMs } = await timed(() => queueCounts(connected, name));
        return { name, ok: true, latencyMs, counts: value };
      } catch (error) {
        return { name, ...failure(error), counts: null };
      }
    }),
  );

  return { postgres: await postgres, redis: redisCheck, migrations: await migrations, queues, checkedAt: new Date() };
}
export type ServiceStatus = Awaited<ReturnType<typeof getServiceStatus>>;
