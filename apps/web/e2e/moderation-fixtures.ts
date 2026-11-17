import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { createAccount, enableTwoFactor, query, signInAs, type FreshAccount, type InternalRole } from "./admin-fixtures";
import { createConversation, createMember, createProvider, type FreshProvider, type Tracked } from "./peripherals-fixtures";

/**
 * Hilfen für die Specs der Moderation (Schritt 1.13): Fälle, Nachrichten,
 * Medien und Einschränkungen direkt in der Datenbank, mit erkennbar
 * fiktiven Konten. Aufräumen über `cleanupModeration`; Audit-Einträge
 * bleiben, wie im Betrieb.
 */
export type Priority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";

export interface ModerationTrack extends Tracked {
  media: string[];
}

export const moderationTracked = (): ModerationTrack => ({ users: [], conversations: [], reports: [], media: [] });

export { createConversation, createMember, createProvider, type FreshProvider };

/** Nachricht mit ID, für Meldungen zu einer einzelnen Nachricht. */
export async function addMessageWithId(conversationId: string, senderId: string, body: string): Promise<{ id: string; sentAt: Date }> {
  const id = `e2e_msg_${randomUUID()}`;
  const sentAt = new Date(Date.now() - 60_000);
  await query(`insert into message (id, "conversationId", "senderId", body, "clientId", "createdAt") values ($1, $2, $3, $4, $5, $6)`, [id, conversationId, senderId, body, randomUUID(), sentAt]);
  await query(`update conversation set "lastMessageAt" = greatest("lastMessageAt", $2) where id = $1`, [conversationId, sentAt]);
  return { id, sentAt };
}

export interface CaseInput {
  reporterId: string | null;
  targetType: "MESSAGE" | "USER" | "PROFILE" | "MEDIA" | "REVIEW";
  targetId: string;
  reason: string;
  priority: Priority;
  createdAt?: Date;
  evidence?: unknown;
  details?: string;
}

/** Offener Fall wie aus `fileReport`, ohne Sofortsperre. */
export async function createCase(track: ModerationTrack, input: CaseInput): Promise<string> {
  const id = `e2e_case_${randomUUID()}`;
  track.reports.push(id);
  await query(
    `insert into report (id, "reporterId", "targetType", "targetId", reason, details, urgent, priority, evidence, "escalatedAt", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())`,
    [
      id,
      input.reporterId,
      input.targetType,
      input.targetId,
      input.reason,
      input.details ?? null,
      input.priority === "CRITICAL",
      input.priority,
      input.evidence === undefined ? null : JSON.stringify(input.evidence),
      input.priority === "CRITICAL" ? new Date() : null,
      input.createdAt ?? new Date(),
    ],
  );
  return id;
}

/** Fall zu einer Nachricht mit Kopie, wie `reportMessage` ihn anlegt. */
export async function createMessageCase(track: ModerationTrack, data: { reporterId: string; conversationId: string; senderId: string; message: { id: string; sentAt: Date }; body: string; priority: Priority; reason: string }) {
  return createCase(track, {
    reporterId: data.reporterId,
    targetType: "MESSAGE",
    targetId: data.message.id,
    reason: data.reason,
    priority: data.priority,
    evidence: { conversationId: data.conversationId, senderId: data.senderId, sentAt: data.message.sentAt.toISOString(), body: data.body },
  });
}

export async function caseNumber(reportId: string): Promise<{ number: number; year: number }> {
  const [row] = await query<{ number: number; year: number }>(`select number, extract(year from "createdAt" at time zone 'Europe/Zurich')::int as year from report where id = $1`, [reportId]);
  if (!row) throw new Error("Fall fehlt");
  return row;
}

export function caseLabel({ number, year }: { number: number; year: number }): string {
  return `M-${year}-${String(number).padStart(5, "0")}`;
}

export async function caseRow(reportId: string) {
  const [row] = await query<{ status: string; decision: string | null; rule: string | null; appealStatus: string; decidedById: string | null; assignedToId: string | null }>(
    `select status, decision, rule, "appealStatus", "decidedById", "assignedToId" from report where id = $1`,
    [reportId],
  );
  return row;
}

/** Aktive Einschränkung direkt anlegen, wie `restrictAccount`. */
export async function restrict(userId: string, kind: "MESSAGING" | "BOOKING" | "SUSPENDED", createdById: string, until: Date | null = null): Promise<string> {
  const id = `e2e_restr_${randomUUID()}`;
  await query(
    `insert into account_restriction (id, "userId", kind, rule, reason, until, "createdById") values ($1, $2, $3, 'R-MOD-1', 'Fiktive Begründung der Einschränkung für den Test.', $4, $5)`,
    [id, userId, kind, until, createdById],
  );
  return id;
}

export async function restrictions(userId: string) {
  return query<{ id: string; kind: string; liftedAt: Date | null; appealStatus: string; until: Date | null }>(
    `select id, kind, "liftedAt", "appealStatus", until from account_restriction where "userId" = $1 order by "createdAt"`,
    [userId],
  );
}

/** Medium eines Anbieters ohne Varianten; für Studio und Moderation reicht der Datensatz. */
export async function createMedia(track: ModerationTrack, owner: FreshProvider, status: string): Promise<string> {
  const id = `e2e_media_${randomUUID()}`;
  track.media.push(id);
  await query(`update "user" set "accountType" = 'PROVIDER' where id = $1`, [owner.id]);
  await query(
    `insert into media_asset (id, "ownerUserId", "providerProfileId", status, visibility, "originalKey", width, height, "rightsConfirmedAt", "updatedAt")
     values ($1, $2, $3, $4, 'PUBLIC', $5, 640, 800, now(), now())`,
    [id, owner.id, owner.profileId, status, `o/e2e-${randomUUID()}`],
  );
  return id;
}

export async function mediaStatus(id: string): Promise<string | undefined> {
  return (await query<{ status: string }>(`select status from media_asset where id = $1`, [id]))[0]?.status;
}

export async function cleanupModeration(track: ModerationTrack): Promise<void> {
  if (track.reports.length > 0) await query(`delete from report where id = any($1)`, [track.reports.splice(0)]);
  if (track.media.length > 0) await query(`delete from media_asset where id = any($1)`, [track.media.splice(0)]);
  if (track.conversations.length > 0) await query(`delete from conversation where id = any($1)`, [track.conversations.splice(0)]);
  if (track.users.length > 0) {
    // Fälle, die Tests über die Oberfläche angelegt haben (zum Beispiel durch einen Einspruch), hängen an den Konten.
    await query(`delete from report where "reporterId" = any($1)`, [track.users]);
    await query(`delete from "user" where id = any($1)`, [track.users.splice(0)]);
  }
}

/**
 * Zweite interne Person in derselben Seite: Die Anmeldung über einer
 * bestehenden Sitzung braucht die Herkunft (CSRF-Schutz), anders als
 * `signInAdmin` auf einer frischen Seite.
 */
export async function switchToAdmin(page: Page, baseURL: string | undefined, role: InternalRole, name?: string): Promise<FreshAccount> {
  const account = await createAccount(role, name);
  await signInAs(page, account, baseURL);
  await enableTwoFactor(page, baseURL);
  return account;
}

export type { FreshAccount };
