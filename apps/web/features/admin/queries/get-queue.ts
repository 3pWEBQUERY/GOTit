import { getDb } from "@app/db";
import type { ReviewKind } from "@app/db";
import { listOpenReviews } from "@app/core/verification";

export interface QueueCase {
  id: string;
  /** Erstprüfung oder Änderung eines veröffentlichten Profils (PRD v2 11.2). */
  kind: ReviewKind;
  displayName: string;
  submittedAt: Date;
  assigneeName: string | null;
}

/** Offene Prüffälle, älteste zuerst, mit dem Namen der zuständigen Person. */
export async function getQueue(): Promise<QueueCase[]> {
  const reviews = await listOpenReviews();
  const assigneeIds = [...new Set(reviews.flatMap((review) => (review.assignedToId ? [review.assignedToId] : [])))];
  const assignees =
    assigneeIds.length > 0 ? await getDb().user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(assignees.map((user) => [user.id, user.name]));
  return reviews.map((review) => ({
    id: review.id,
    kind: review.kind,
    displayName: review.providerProfile.displayName,
    submittedAt: review.submittedAt,
    assigneeName: review.assignedToId ? (names.get(review.assignedToId) ?? null) : null,
  }));
}

/** Ältester offener Fall, ausser dem genannten; null, wenn keiner mehr offen ist. */
export async function getNextOpenCaseId(exceptId?: string): Promise<string | null> {
  const next = await getDb().profileReview.findFirst({
    where: { decision: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
    orderBy: { submittedAt: "asc" },
    select: { id: true },
  });
  return next?.id ?? null;
}

export async function countOpenCases(): Promise<number> {
  return getDb().profileReview.count({ where: { decision: null } });
}
