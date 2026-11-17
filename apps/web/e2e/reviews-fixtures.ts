import { randomUUID } from "node:crypto";
import { query, type FreshAccount } from "./admin-fixtures";
import { createConversation, type FictiveProvider } from "./messages-fixtures";

/**
 * Hilfen für die Specs der Bewertungen (Entscheid 0017): Termine per SQL mit
 * Unterhaltung und Ereignissen, wie sie die Terminanfrage anlegt, und
 * Bewertungen direkt in der Tabelle. Der Trigger der Datenbank verlangt dafür
 * einen stattgefundenen Termin des Mitglieds; Testdaten gehen also denselben
 * Weg wie echte.
 */
export const REVIEW_TEXT =
  "Fiktive Bewertung aus dem Test: pünktlich, freundlich und genau wie im Profil beschrieben.";

/** Termin des Mitglieds, der vor `hoursAgo` Stunden geendet hat; Standard «Stattgefunden». */
export async function createAppointment(
  member: FreshAccount,
  provider: FictiveProvider,
  options: { status?: "COMPLETED" | "CONFIRMED"; hoursAgo?: number } = {},
): Promise<{ requestId: string; conversationId: string }> {
  const status = options.status ?? "COMPLETED";
  const endsAt = new Date(Date.now() - (options.hoursAgo ?? 3) * 3600_000);
  const startsAt = new Date(endsAt.getTime() - 3600_000);
  const existing = await query<{ id: string }>(
    `select id from conversation where "memberUserId" = $1 and "providerProfileId" = $2`,
    [member.id, provider.profileId],
  );
  const conversationId =
    existing[0]?.id ??
    (await createConversation(member, provider, [
      {
        from: "member",
        body: "Guten Tag, ich frage einen Termin an.",
        minutesAgo: 600,
      },
    ]));
  const requestId = `e2e_req_${randomUUID()}`;
  await query(
    `insert into booking_request (id, "conversationId", "providerProfileId", "memberUserId", status, "startsAt", "endsAt", "lastProposedBy", "expiresAt", message, "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, 'MEMBER', $6, 'Fiktive Nachricht zur Anfrage.', now())`,
    [
      requestId,
      conversationId,
      provider.profileId,
      member.id,
      status,
      startsAt,
      endsAt,
    ],
  );
  await query(
    `insert into booking_event (id, "requestId", "actorRole", action, "toStatus", "startsAt", "endsAt") values ($1, $2, 'MEMBER', 'created', 'REQUESTED', $3, $4)`,
    [`e2e_evt_${randomUUID()}`, requestId, startsAt, endsAt],
  );
  await query(
    `insert into booking_event (id, "requestId", "actorRole", action, "fromStatus", "toStatus") values ($1, $2, 'PROVIDER', 'accept', 'REQUESTED', 'CONFIRMED')`,
    [`e2e_evt_${randomUUID()}`, requestId],
  );
  if (status === "COMPLETED")
    await query(
      `insert into booking_event (id, "requestId", "actorRole", action, "fromStatus", "toStatus") values ($1, $2, 'PROVIDER', 'complete', 'CONFIRMED', 'COMPLETED')`,
      [`e2e_evt_${randomUUID()}`, requestId],
    );
  return { requestId, conversationId };
}

export type ReviewStatus = "PENDING" | "PUBLISHED" | "REJECTED" | "REMOVED";

/** Bewertung zu einem stattgefundenen Termin, wie `createReview` sie anlegt. */
export async function createReviewRow(
  member: FreshAccount,
  provider: FictiveProvider,
  requestId: string,
  options: { status?: ReviewStatus; text?: string; response?: string } = {},
): Promise<string> {
  const id = `e2e_rev_${randomUUID()}`;
  const status = options.status ?? "PENDING";
  const published = status === "PUBLISHED" || status === "REMOVED";
  await query(
    `insert into review (id, "bookingRequestId", "providerProfileId", "authorUserId", communication, accuracy, organization, overall, text, status, "publishedAt", response, "respondedAt", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, 5, 4, 3, 4, $5, $6, ${published ? "now() - interval '1 day'" : "null"}, $7, ${options.response ? "now()" : "null"}, now() - interval '2 days', now())`,
    [
      id,
      requestId,
      provider.profileId,
      member.id,
      options.text ?? REVIEW_TEXT,
      status,
      options.response ?? null,
    ],
  );
  return id;
}

export async function reviewRow(id: string) {
  const [row] = await query<{
    status: string;
    response: string | null;
    moderationReason: string | null;
  }>(
    `select status::text as status, response, "moderationReason" from review where id = $1`,
    [id],
  );
  return row;
}

export async function appealRows(reviewId: string) {
  return query<{ byRole: string; status: string; reason: string }>(
    `select "byRole"::text as "byRole", status::text as status, reason from review_appeal where "reviewId" = $1 order by "createdAt"`,
    [reviewId],
  );
}

/** Offener Einspruch per SQL, wie `appealReview` ihn anlegt. */
export async function createAppealRow(
  reviewId: string,
  byRole: "MEMBER" | "PROVIDER",
  reason: string,
): Promise<string> {
  const id = `e2e_app_${randomUUID()}`;
  await query(
    `insert into review_appeal (id, "reviewId", "byRole", reason) values ($1, $2, $3, $4)`,
    [id, reviewId, byRole, reason],
  );
  return id;
}
