import { getDb, InternalRole, type Prisma, type RestrictionKind } from "@app/db";
import { z } from "zod";
import { REVIEWER_ROLES } from "../verification/review-service";
import { AdminForbiddenError, assertPermission } from "./permissions";

/**
 * Nutzerverwaltung (v1 9.2, v2 7.8 `/admin/nutzer`): Konten suchen und
 * ansehen, interne Rollen vergeben. Ohne Nachrichteninhalte und ohne
 * Ausweisdaten; die Prüfung der Identität sieht nur, wer selbst prüfen darf
 * («soweit berechtigt»). Einschränken und Sperren liegt in der Moderation.
 */
export const USER_PAGE_SIZE = 50;
const INTERNAL_ROLES = Object.values(InternalRole) as [InternalRole, ...InternalRole[]];

export const userSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  filter: z.enum(["all", "restricted", "suspended", "internal", "providers"]).default("all"),
  cursor: z.string().min(1).max(64).optional(),
});
export type UserSearchInput = z.input<typeof userSearchSchema>;

const idSchema = z.string().min(1).max(64);
export const roleReasonSchema = z.string().trim().min(10).max(500);
const rolesSchema = z.array(z.enum(INTERNAL_ROLES)).max(INTERNAL_ROLES.length);

/** Gilt die Einschränkung gerade? Wie `activeRestrictionKinds` in der Moderation. */
function activeRestriction(now: Date): Prisma.AccountRestrictionWhereInput {
  return { liftedAt: null, OR: [{ until: null }, { until: { gt: now } }] };
}

/** Aktive Arten pro Konto in einer Abfrage. Eine Sperre schliesst alle anderen ein. */
async function activeKindsByUser(userIds: string[], now: Date): Promise<Map<string, RestrictionKind[]>> {
  const rows = userIds.length
    ? await getDb().accountRestriction.findMany({ where: { userId: { in: userIds }, ...activeRestriction(now) }, select: { userId: true, kind: true } })
    : [];
  const byUser = new Map<string, Set<RestrictionKind>>();
  for (const row of rows) {
    const kinds = byUser.get(row.userId) ?? new Set<RestrictionKind>();
    kinds.add(row.kind);
    if (row.kind === "SUSPENDED") {
      kinds.add("MESSAGING");
      kinds.add("BOOKING");
    }
    byUser.set(row.userId, kinds);
  }
  return new Map([...byUser].map(([userId, kinds]) => [userId, [...kinds].sort()]));
}

const userSelect = {
  id: true,
  username: true,
  email: true,
  accountType: true,
  createdAt: true,
  deactivatedAt: true,
  deletionRequestedAt: true,
  twoFactorEnabled: true,
  internalRoles: { select: { role: true } },
  providerProfile: { select: { id: true, slug: true, displayName: true, status: true } },
} as const satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function toSummary(row: UserRow, kinds: RestrictionKind[]) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    accountType: row.accountType,
    createdAt: row.createdAt,
    deactivatedAt: row.deactivatedAt,
    deletionRequestedAt: row.deletionRequestedAt,
    twoFactorEnabled: row.twoFactorEnabled,
    internalRoles: row.internalRoles.map((assignment) => assignment.role).sort(),
    providerProfile: row.providerProfile
      ? { slug: row.providerProfile.slug, displayName: row.providerProfile.displayName, status: row.providerProfile.status }
      : null,
    restrictions: kinds,
  };
}
export type AdminUserSummary = ReturnType<typeof toSummary>;

function filterWhere(filter: UserSearchInput["filter"], now: Date): Prisma.UserWhereInput {
  switch (filter) {
    case "restricted":
      return { restrictions: { some: { kind: { in: ["MESSAGING", "BOOKING"] }, ...activeRestriction(now) } } };
    case "suspended":
      return { restrictions: { some: { kind: "SUSPENDED", ...activeRestriction(now) } } };
    case "internal":
      return { internalRoles: { some: {} } };
    case "providers":
      return { OR: [{ accountType: "PROVIDER" }, { providerProfile: { isNot: null } }] };
    default:
      return {};
  }
}

/**
 * Suche nach Benutzername, E-Mail, Anzeigename oder Slug des Profils oder
 * exakter ID; neueste Konten zuerst, 50 pro Seite. `nextCursor` ist die ID
 * des letzten Kontos der Seite.
 */
export async function searchUsers(actorId: string, input: UserSearchInput = {}, now = new Date()) {
  await assertPermission(actorId, "users.view");
  const parsed = userSearchSchema.safeParse(input);
  if (!parsed.success) return { users: [] as AdminUserSummary[], nextCursor: null };
  const { q, filter, cursor } = parsed.data;
  const where: Prisma.UserWhereInput[] = [filterWhere(filter, now)];
  if (q) {
    where.push({
      OR: [
        { id: q },
        { username: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { providerProfile: { displayName: { contains: q, mode: "insensitive" } } },
        { providerProfile: { slug: { contains: q.toLowerCase() } } },
      ],
    });
  }
  const rows = await getDb().user.findMany({
    where: { AND: where },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: USER_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: userSelect,
  });
  const page = rows.slice(0, USER_PAGE_SIZE);
  const kinds = await activeKindsByUser(page.map((row) => row.id), now);
  return {
    users: page.map((row) => toSummary(row, kinds.get(row.id) ?? [])),
    nextCursor: rows.length > USER_PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
  };
}

/**
 * Detailansicht eines Kontos. Schreibt `user.viewed` ins Audit-Log. Die
 * Identitätsprüfung (nur Status und Daten, nie Dokumentdaten) erhält nur,
 * wer Verifizierungen prüfen darf; sonst ist sie null.
 */
export async function getUserDetail(actorId: string, userId: string, now = new Date()) {
  const actor = await assertPermission(actorId, "users.view");
  if (!idSchema.safeParse(userId).success) return null;
  const db = getDb();
  const row = await db.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!row) return null;
  const profileId = row.providerProfile?.id ?? null;
  const reviewer = actor.roles.some((role) => (REVIEWER_ROLES as readonly InternalRole[]).includes(role));
  const [kinds, memberships, restrictions, reportCount, securityEvents, identity] = await Promise.all([
    activeKindsByUser([userId], now),
    db.organizationMember.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { role: true, organization: { select: { name: true, slug: true, status: true } } },
    }),
    db.accountRestriction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kind: true,
        rule: true,
        reason: true,
        until: true,
        createdAt: true,
        createdById: true,
        liftedAt: true,
        liftReason: true,
        appealStatus: true,
        appealedAt: true,
      },
    }),
    db.report.count({
      where: { OR: [{ targetType: "USER", targetId: userId }, ...(profileId ? [{ targetType: "PROFILE" as const, targetId: profileId }] : [])] },
    }),
    db.securityEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, select: { type: true, createdAt: true } }),
    reviewer
      ? db.identityCheck.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { status: true, checkedAt: true, expiresAt: true } })
      : Promise.resolve(undefined),
  ]);
  await db.auditEvent.create({ data: { actorId, action: "user.viewed", target: `user:${userId}` } });
  return {
    ...toSummary(row, kinds.get(userId) ?? []),
    organizations: memberships.map((member) => ({ ...member.organization, role: member.role })),
    restrictionHistory: restrictions.map((restriction) => ({ ...restriction, active: restriction.liftedAt === null && (!restriction.until || restriction.until > now) })),
    reportCount,
    securityEvents,
    // null: nicht berechtigt. `latest` null: keine Prüfung vorhanden.
    identityCheck: reviewer ? { latest: identity ?? null } : null,
  };
}
export type AdminUserDetail = NonNullable<Awaited<ReturnType<typeof getUserDetail>>>;

export type SetRolesResult = { ok: true } | { ok: false; reason: "invalid" | "not-found" | "self-super-admin" | "last-super-admin" };

const roleList = (roles: readonly InternalRole[]) => (roles.length ? [...roles].sort().join(",") : "keine");

/**
 * Ersetzt die internen Rollen eines Kontos (nur `SUPER_ADMIN`). Niemand nimmt
 * sich selbst `SUPER_ADMIN`, und mindestens ein `SUPER_ADMIN` bleibt. Die
 * Prüfung läuft unter einer Sperre, damit zwei gleichzeitige Änderungen nicht
 * den letzten entfernen.
 */
export async function setInternalRoles(actorId: string, userId: string, roles: InternalRole[], reason: string): Promise<SetRolesResult> {
  await assertPermission(actorId, "roles.manage");
  const parsedRoles = rolesSchema.safeParse(roles);
  const parsedReason = roleReasonSchema.safeParse(reason);
  if (!parsedRoles.success || !parsedReason.success || !idSchema.safeParse(userId).success) return { ok: false, reason: "invalid" };
  const next = [...new Set(parsedRoles.data)].sort();
  const db = getDb();
  return db.$transaction(async (tx): Promise<SetRolesResult> => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('internal_role_assignment'))`;
    const actorStill = await tx.internalRoleAssignment.count({ where: { userId: actorId, role: "SUPER_ADMIN" } });
    if (actorStill === 0) throw new AdminForbiddenError("roles.manage", "role-missing");
    const target = await tx.user.findUnique({ where: { id: userId }, select: { internalRoles: { select: { role: true } } } });
    if (!target) return { ok: false, reason: "not-found" };
    const previous = target.internalRoles.map((assignment) => assignment.role).sort();
    const losesSuper = previous.includes("SUPER_ADMIN") && !next.includes("SUPER_ADMIN");
    if (losesSuper && userId === actorId) return { ok: false, reason: "self-super-admin" };
    if (losesSuper) {
      const others = await tx.internalRoleAssignment.count({ where: { role: "SUPER_ADMIN", userId: { not: userId } } });
      if (others === 0) return { ok: false, reason: "last-super-admin" };
    }
    const removed = previous.filter((role) => !next.includes(role));
    const added = next.filter((role) => !previous.includes(role));
    if (removed.length) await tx.internalRoleAssignment.deleteMany({ where: { userId, role: { in: removed } } });
    if (added.length) await tx.internalRoleAssignment.createMany({ data: added.map((role) => ({ userId, role, grantedBy: actorId })) });
    await tx.auditEvent.create({
      data: {
        actorId,
        action: "user.roles_changed",
        target: `user:${userId}`,
        reason: `${parsedReason.data} (vorher: ${roleList(previous)}; nachher: ${roleList(next)})`,
      },
    });
    return { ok: true };
  });
}

/** Alle Konten mit interner Rolle, mit Rollen und 2FA-Status. */
export async function listInternalStaff(actorId: string) {
  await assertPermission(actorId, "roles.manage");
  const rows = await getDb().user.findMany({
    where: { internalRoles: { some: {} } },
    orderBy: [{ username: "asc" }, { id: "asc" }],
    select: {
      id: true,
      username: true,
      email: true,
      twoFactorEnabled: true,
      deactivatedAt: true,
      internalRoles: { orderBy: { role: "asc" }, select: { role: true, grantedAt: true, grantedBy: true } },
    },
  });
  return rows.map(({ internalRoles, ...user }) => ({ ...user, roles: internalRoles }));
}
