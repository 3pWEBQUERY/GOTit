import { getDb, Prisma, type ParticipantRole } from "@app/db";
import { SEARCH_MAX_LENGTH, type InboxView } from "./schemas";

/**
 * Postfach (v1 FR-CHAT-002, v2 11.4): Alle, Ungelesen, Favoriten, Archiviert,
 * dazu für Anbieter der Filter nach Label und die Suche in eigenen Chats.
 * Die Abfrage beginnt immer bei der eigenen Teilnahme; fremde Chats kommen
 * darin nicht vor.
 */
export interface InboxCounterpart {
  /** Anbieter: Anzeigename und Slug. Mitglied: Benutzername oder null (die Oberfläche zeigt «Mitglied»). */
  name: string | null;
  profileSlug: string | null;
  role: ParticipantRole;
  /** Nur für Mitglieder: Beitrittsdatum, für «Mitglied» mit Jahr, wenn ein Benutzername fehlt. */
  memberSince: Date | null;
}

export interface InboxEntry {
  conversationId: string;
  counterpart: InboxCounterpart;
  /** Anfang der letzten Nachricht; null, wenn gelöscht oder nur ein Bild. */
  preview: string | null;
  lastFromMe: boolean;
  lastKind: "text" | "image" | "deleted" | "none";
  lastMessageAt: Date;
  unread: number;
  starred: boolean;
  archived: boolean;
  /** Blockiert das eigene Konto die Gegenseite? */
  blockedByMe: boolean;
  labels: { id: string; name: string }[];
}

export interface InboxQuery {
  view?: InboxView;
  /** Nur Unterhaltungen, in denen das Konto diese Seite ist: `MEMBER` im Marktplatz, `PROVIDER` im Studio. */
  role?: ParticipantRole | null;
  labelId?: string | null;
  q?: string | null;
}

interface Row {
  conversationId: string;
  role: ParticipantRole;
  starred: boolean;
  archivedAt: Date | null;
  lastMessageAt: Date;
  counterpartId: string;
  counterpartUsername: string | null;
  counterpartSince: Date;
  profileName: string;
  profileSlug: string;
  unread: bigint;
  lastBody: string | null;
  lastSender: string | null;
  lastDeleted: Date | null;
  lastHasImage: boolean | null;
  blockedByMe: boolean;
}

const PREVIEW_LENGTH = 120;

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function listInbox(
  userId: string,
  query: InboxQuery = {},
  limit = 100,
): Promise<InboxEntry[]> {
  const db = getDb();
  const view = query.view ?? "alle";
  const filters: Prisma.Sql[] = [Prisma.sql`me."userId" = ${userId}`];
  if (query.role)
    filters.push(Prisma.sql`me.role = ${query.role}::"ParticipantRole"`);
  if (view === "archiviert")
    filters.push(Prisma.sql`me."archivedAt" IS NOT NULL`);
  else filters.push(Prisma.sql`me."archivedAt" IS NULL`);
  if (view === "favoriten") filters.push(Prisma.sql`me.starred = true`);
  if (query.labelId)
    filters.push(
      Prisma.sql`EXISTS (SELECT 1 FROM conversation_label cl WHERE cl."conversationId" = c.id AND cl."userId" = ${userId} AND cl."labelId" = ${query.labelId})`,
    );
  const term = query.q?.replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_LENGTH);
  if (term) {
    const like = `%${escapeLike(term)}%`;
    filters.push(Prisma.sql`(
      (me.role = 'MEMBER' AND pp."displayName" ILIKE ${like})
      OR (me.role = 'PROVIDER' AND u.username ILIKE ${like})
      OR EXISTS (SELECT 1 FROM message s WHERE s."conversationId" = c.id AND s."deletedAt" IS NULL AND s.body ILIKE ${like})
    )`);
  }
  const unreadExpr = Prisma.sql`(SELECT count(*) FROM message m WHERE m."conversationId" = c.id AND m."senderId" <> ${userId} AND m."deletedAt" IS NULL AND (me."lastReadAt" IS NULL OR m."createdAt" > me."lastReadAt"))`;
  if (view === "ungelesen") filters.push(Prisma.sql`${unreadExpr} > 0`);

  const rows = await db.$queryRaw<Row[]>`
    SELECT c.id AS "conversationId", me.role, me.starred, me."archivedAt", c."lastMessageAt",
           other."userId" AS "counterpartId", u.username AS "counterpartUsername", u."createdAt" AS "counterpartSince",
           pp."displayName" AS "profileName", pp.slug AS "profileSlug",
           ${unreadExpr} AS unread,
           last.body AS "lastBody", last."senderId" AS "lastSender", last."deletedAt" AS "lastDeleted",
           EXISTS (SELECT 1 FROM message_attachment a WHERE a."messageId" = last.id) AS "lastHasImage",
           EXISTS (SELECT 1 FROM block b WHERE b."blockerId" = ${userId} AND b."blockedId" = other."userId") AS "blockedByMe"
    FROM conversation_participant me
    JOIN conversation c ON c.id = me."conversationId"
    JOIN conversation_participant other ON other."conversationId" = c.id AND other."userId" <> me."userId"
    JOIN "user" u ON u.id = other."userId"
    JOIN provider_profile pp ON pp.id = c."providerProfileId"
    LEFT JOIN LATERAL (
      SELECT id, body, "senderId", "deletedAt" FROM message WHERE "conversationId" = c.id ORDER BY "createdAt" DESC, id DESC LIMIT 1
    ) last ON true
    WHERE ${Prisma.join(filters, " AND ")}
    ORDER BY c."lastMessageAt" DESC, c.id ASC
    LIMIT ${limit}`;

  const labels =
    rows.length === 0
      ? []
      : await db.conversationLabel.findMany({
          where: {
            userId,
            conversationId: { in: rows.map((row) => row.conversationId) },
          },
          select: {
            conversationId: true,
            label: { select: { id: true, name: true, sortOrder: true } },
          },
        });
  return rows.map((row) => ({
    conversationId: row.conversationId,
    counterpart:
      row.role === "MEMBER"
        ? {
            name: row.profileName,
            profileSlug: row.profileSlug,
            role: "PROVIDER",
            memberSince: null,
          }
        : {
            name: row.counterpartUsername,
            profileSlug: null,
            role: "MEMBER",
            memberSince: row.counterpartSince,
          },
    preview:
      row.lastDeleted || !row.lastBody
        ? null
        : row.lastBody.slice(0, PREVIEW_LENGTH),
    lastFromMe: row.lastSender === userId,
    lastKind: !row.lastSender
      ? "none"
      : row.lastDeleted
        ? "deleted"
        : row.lastBody
          ? "text"
          : row.lastHasImage
            ? "image"
            : "none",
    lastMessageAt: row.lastMessageAt,
    unread: Number(row.unread),
    starred: row.starred,
    archived: row.archivedAt !== null,
    blockedByMe: row.blockedByMe,
    labels: labels
      .filter((entry) => entry.conversationId === row.conversationId)
      .sort((a, b) => a.label.sortOrder - b.label.sortOrder)
      .map((entry) => ({ id: entry.label.id, name: entry.label.name })),
  }));
}

/**
 * Ungelesene Unterhaltungen, für Kopfzeile, Tab-Leiste und Studio-Seitenleiste.
 * Mit `role` nur die Unterhaltungen, in denen das Konto diese Seite ist:
 * `MEMBER` für den Marktplatz, `PROVIDER` für das Studio.
 */
export async function countUnreadConversations(
  userId: string,
  role?: ParticipantRole,
): Promise<number> {
  const roleFilter = role
    ? Prisma.sql`AND me.role = ${role}::"ParticipantRole"`
    : Prisma.empty;
  const [row] = await getDb().$queryRaw<{ total: bigint }[]>`
    SELECT count(*) AS total FROM conversation_participant me
    WHERE me."userId" = ${userId} AND me."archivedAt" IS NULL ${roleFilter} AND EXISTS (
      SELECT 1 FROM message m WHERE m."conversationId" = me."conversationId" AND m."senderId" <> ${userId} AND m."deletedAt" IS NULL
        AND (me."lastReadAt" IS NULL OR m."createdAt" > me."lastReadAt"))`;
  return Number(row?.total ?? 0);
}
