import { randomUUID } from "node:crypto";
import { createAccount, query, type FreshAccount } from "./admin-fixtures";

/**
 * Hilfen für `messages-peripherals.spec.ts`: Unterhaltungen, Nachrichten,
 * Blockierungen und Meldungen direkt in der Datenbank, mit erkennbar
 * fiktiven Konten. `cleanupPeripherals` entfernt alles, was ein Test anlegt;
 * Audit-Einträge bleiben, wie im Betrieb.
 */
export interface Tracked {
  users: string[];
  conversations: string[];
  reports: string[];
}

export const tracked = (): Tracked => ({ users: [], conversations: [], reports: [] });

export interface FreshProvider extends FreshAccount {
  profileId: string;
  displayName: string;
}

/** Mitglied ohne Anbieterrolle; mit `username`, sonst erscheint es als «Mitglied». */
export async function createMember(track: Tracked, username?: string): Promise<FreshAccount> {
  const account = await createAccount(undefined, `Registrierter Name ${randomUUID().slice(0, 6)}`);
  track.users.push(account.id);
  if (username) await query(`update "user" set username = $2 where id = $1`, [account.id, username]);
  return account;
}

/** Anbieterkonto mit veröffentlichtem Profil. */
export async function createProvider(track: Tracked, label: string): Promise<FreshProvider> {
  const suffix = randomUUID().slice(0, 8);
  const account = await createAccount(undefined, `Anbieterkonto ${suffix} Fiktiv`);
  track.users.push(account.id);
  const profileId = `e2e_profile_${suffix}`;
  const displayName = `${label} ${suffix} Fiktiv`;
  await query(
    `insert into provider_profile (id, "userId", slug, "displayName", status, description, languages, "updatedAt")
     values ($1, $2, $3, $4, 'PUBLISHED', 'Fiktive Beschreibung für einen Test der Nachrichten.', '{de}', now())`,
    [profileId, account.id, `peri-${suffix}`, displayName],
  );
  return { ...account, profileId, displayName };
}

/** Unterhaltung zwischen Mitgliederseite und Anbieterprofil. */
export async function createConversation(track: Tracked, member: FreshAccount, provider: FreshProvider): Promise<string> {
  const id = `e2e_conv_${randomUUID()}`;
  track.conversations.push(id);
  await query(`insert into conversation (id, "providerProfileId", "memberUserId") values ($1, $2, $3)`, [id, provider.profileId, member.id]);
  await query(`insert into conversation_participant ("conversationId", "userId", role) values ($1, $2, 'MEMBER'), ($1, $3, 'PROVIDER')`, [id, member.id, provider.id]);
  return id;
}

/** Nachricht vor `minutesAgo` Minuten; hält `lastMessageAt` der Unterhaltung aktuell. */
export async function addMessage(conversationId: string, senderId: string, body: string, minutesAgo = 0): Promise<void> {
  const at = new Date(Date.now() - minutesAgo * 60_000);
  await query(`insert into message (id, "conversationId", "senderId", body, "clientId", "createdAt") values ($1, $2, $3, $4, $5, $6)`, [
    `e2e_msg_${randomUUID()}`,
    conversationId,
    senderId,
    body,
    randomUUID(),
    at,
  ]);
  await query(`update conversation set "lastMessageAt" = greatest("lastMessageAt", $2) where id = $1`, [conversationId, at]);
}

export async function markRead(conversationId: string, userId: string): Promise<void> {
  await query(`update conversation_participant set "lastReadAt" = now() where "conversationId" = $1 and "userId" = $2`, [conversationId, userId]);
}

export async function block(blockerId: string, blockedId: string): Promise<void> {
  await query(`insert into block ("blockerId", "blockedId") values ($1, $2)`, [blockerId, blockedId]);
}

export async function blockCount(blockerId: string, blockedId: string): Promise<number> {
  const [row] = await query<{ count: string }>(`select count(*) from block where "blockerId" = $1 and "blockedId" = $2`, [blockerId, blockedId]);
  return Number(row?.count ?? 0);
}

/** Offene Meldung zu einem Mitglied mit Kopie von Nachrichten, wie `reportCounterpart` sie anlegt. */
export async function createReport(
  track: Tracked,
  data: { reporterId: string; targetId: string; reason: string; urgent: boolean; minutesAgo: number; details?: string; messages?: string[] },
): Promise<string> {
  const id = `e2e_report_${randomUUID()}`;
  track.reports.push(id);
  const evidence = {
    conversationId: "e2e",
    messages: (data.messages ?? []).map((body, index) => ({ id: `${id}_m${index}`, body, sentAt: new Date(Date.now() - (index + 1) * 60_000).toISOString() })),
  };
  await query(
    `insert into report (id, "reporterId", "targetType", "targetId", reason, details, urgent, evidence, "createdAt", "updatedAt")
     values ($1, $2, 'USER', $3, $4, $5, $6, $7, $8, now())`,
    [id, data.reporterId, data.targetId, data.reason, data.details ?? null, data.urgent, JSON.stringify(evidence), new Date(Date.now() - data.minutesAgo * 60_000)],
  );
  return id;
}

export async function reportAudits(reportId: string) {
  return query<{ actorId: string; action: string; reason: string | null }>(`select "actorId", action, reason from audit_event where target = $1 order by "createdAt"`, [`report:${reportId}`]);
}

export async function cleanupPeripherals(track: Tracked): Promise<void> {
  if (track.reports.length > 0) await query(`delete from report where id = any($1)`, [track.reports.splice(0)]);
  if (track.conversations.length > 0) await query(`delete from conversation where id = any($1)`, [track.conversations.splice(0)]);
  if (track.users.length > 0) await query(`delete from "user" where id = any($1)`, [track.users.splice(0)]);
}
