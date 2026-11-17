import { getReviewForModeration, listReviewQueue } from "@app/core/review";
import { getDb } from "@app/db";
import { cache } from "react";

export type ReviewCase = NonNullable<
  Awaited<ReturnType<typeof getReviewForModeration>>
>;

/** Eintrag der Warteschlange: eine neue Bewertung oder ein offener Einspruch. */
export interface ReviewQueueEntry {
  key: string;
  reviewId: string;
  kind: "new" | "appealProvider" | "appealMember";
  profileName: string;
  submittedAt: Date;
}

/**
 * Warteschlange `/admin/bewertungen`: neue Bewertungen und offene Einsprüche
 * zusammen, älteste zuerst. Der Kern prüft die Rolle selbst.
 */
export async function getReviewQueue(
  actorId: string,
): Promise<ReviewQueueEntry[]> {
  const { pending, appeals } = await listReviewQueue(actorId);
  const entries: ReviewQueueEntry[] = [
    ...pending.map((review) => ({
      key: `review:${review.id}`,
      reviewId: review.id,
      kind: "new" as const,
      profileName: review.providerProfile.displayName,
      submittedAt: review.createdAt,
    })),
    ...appeals.map((appeal) => ({
      key: `appeal:${appeal.id}`,
      reviewId: appeal.reviewId,
      kind:
        appeal.byRole === "PROVIDER"
          ? ("appealProvider" as const)
          : ("appealMember" as const),
      profileName: appeal.review.providerProfile.displayName,
      submittedAt: appeal.createdAt,
    })),
  ];
  return entries.sort(
    (a, b) =>
      a.submittedAt.getTime() - b.submittedAt.getTime() ||
      a.key.localeCompare(b.key),
  );
}

/** Offene Fälle für die Seitenleiste; nur für Personen mit Moderationsrolle aufgerufen. */
export async function countOpenReviewCases(): Promise<number> {
  const db = getDb();
  const [pending, appeals] = await Promise.all([
    db.review.count({ where: { status: "PENDING" } }),
    db.reviewAppeal.count({ where: { status: "OPEN" } }),
  ]);
  return pending + appeals;
}

/** Gibt es die Bewertung? Ohne Audit-Eintrag, für die echte 404 vor dem Ladezustand. */
export async function reviewExists(id: string): Promise<boolean> {
  if (id.length === 0 || id.length > 64) return false;
  return (await getDb().review.count({ where: { id } })) > 0;
}

/** Der Fall mit Audit-Eintrag `review.viewed`; einmal pro Anfrage. */
export const getReviewCaseFor = cache(
  async (actorId: string, id: string): Promise<ReviewCase | null> =>
    getReviewForModeration(actorId, id),
);

/** Nächster offener Fall nach einem Entscheid, ohne den gerade entschiedenen. */
export async function nextReviewCase(
  actorId: string,
  exceptId: string,
): Promise<string | null> {
  const queue = await getReviewQueue(actorId);
  return queue.find((entry) => entry.reviewId !== exceptId)?.reviewId ?? null;
}
