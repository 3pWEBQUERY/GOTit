import { getDb } from "@app/db";
import { assertModerator } from "../moderation/access";
import { reindexReviewedProfile } from "./service";
import { moderationSchema } from "./schemas";

/**
 * Moderation der Bewertungen (v1 FR-REVIEW-003, v2 12.4 `/admin/bewertungen`):
 * neue Bewertungen vor der Veröffentlichung, Einsprüche danach. Rollenprüfung im
 * Kern; jeder Entscheid atomar und mit Regel und Begründung im Audit-Log.
 */
export async function listReviewQueue(actorId: string) {
  await assertModerator(actorId);
  const db = getDb();
  const [pending, appeals] = await Promise.all([
    db.review.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        overall: true,
        providerProfile: { select: { displayName: true } },
      },
    }),
    db.reviewAppeal.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        byRole: true,
        reviewId: true,
        review: {
          select: {
            status: true,
            providerProfile: { select: { displayName: true } },
          },
        },
      },
    }),
  ]);
  return { pending, appeals };
}

export async function getReviewForModeration(
  actorId: string,
  reviewId: string,
) {
  await assertModerator(actorId);
  if (reviewId.length > 64) return null;
  const db = getDb();
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      status: true,
      communication: true,
      accuracy: true,
      organization: true,
      overall: true,
      text: true,
      response: true,
      createdAt: true,
      publishedAt: true,
      moderationReason: true,
      providerProfile: { select: { slug: true, displayName: true } },
      bookingRequest: {
        select: { startsAt: true, endsAt: true, status: true },
      },
      appeals: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          byRole: true,
          reason: true,
          status: true,
          createdAt: true,
          decidedAt: true,
        },
      },
    },
  });
  if (review)
    await db.auditEvent.create({
      data: { actorId, action: "review.viewed", target: `review:${review.id}` },
    });
  return review;
}

export type ModerateResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "not-open" };

/**
 * Entscheid über eine Bewertung. Aus PENDING: freigeben oder ablehnen. Aus
 * PUBLISHED (nach Meldung oder Einspruch des Anbieters): entfernen. Aus
 * REJECTED oder REMOVED (nach Einspruch des Autors): freigeben. Offene
 * Einsprüche der betroffenen Seite werden mit dem Entscheid abgeschlossen.
 */
export async function moderateReview(
  actorId: string,
  reviewId: string,
  input: unknown,
  now = new Date(),
): Promise<ModerateResult> {
  await assertModerator(actorId);
  const parsed = moderationSchema.safeParse(input);
  if (!parsed.success || reviewId.length > 64)
    return { ok: false, reason: "invalid" };
  const { decision, rule, reason } = parsed.data;
  const from = {
    PUBLISHED: ["PENDING", "REJECTED", "REMOVED"],
    REJECTED: ["PENDING"],
    REMOVED: ["PUBLISHED"],
  } as const;
  const db = getDb();
  const result = await db.$transaction(async (tx) => {
    const current = await tx.review.findUnique({
      where: { id: reviewId },
      select: { status: true, providerProfileId: true, publishedAt: true },
    });
    if (
      !current ||
      !(from[decision] as readonly string[]).includes(current.status)
    )
      return null;
    const { count } = await tx.review.updateMany({
      where: { id: reviewId, status: current.status },
      data: {
        status: decision,
        moderationReason: `${rule}: ${reason}`,
        ...(decision === "PUBLISHED"
          ? { publishedAt: current.publishedAt ?? now }
          : {}),
      },
    });
    if (count === 0) return null;
    // Einspruch des Anbieters ist mit «entfernt» berechtigt, mit «veröffentlicht bleibt» abgewiesen; beim Autor umgekehrt.
    await tx.reviewAppeal.updateMany({
      where: { reviewId, status: "OPEN", byRole: "PROVIDER" },
      data: {
        status: decision === "REMOVED" ? "UPHELD" : "DISMISSED",
        decidedAt: now,
      },
    });
    await tx.reviewAppeal.updateMany({
      where: { reviewId, status: "OPEN", byRole: "MEMBER" },
      data: {
        status: decision === "PUBLISHED" ? "UPHELD" : "DISMISSED",
        decidedAt: now,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId,
        action: `review.${decision.toLowerCase()}`,
        target: `review:${reviewId}`,
        reason: `${rule}: ${reason}`,
      },
    });
    return current.providerProfileId;
  });
  if (!result) return { ok: false, reason: "not-open" };
  await reindexReviewedProfile(result);
  return { ok: true };
}

/** Einspruch ohne Änderung abweisen: Die Bewertung bleibt, wie sie ist. */
export async function dismissAppeal(
  actorId: string,
  appealId: string,
  reason: string,
  now = new Date(),
): Promise<boolean> {
  await assertModerator(actorId);
  if (appealId.length > 64 || reason.trim().length < 10) return false;
  const db = getDb();
  const { count } = await db.reviewAppeal.updateMany({
    where: { id: appealId, status: "OPEN" },
    data: { status: "DISMISSED", decidedAt: now },
  });
  if (count === 0) return false;
  const appeal = await db.reviewAppeal.findUniqueOrThrow({
    where: { id: appealId },
    select: { reviewId: true },
  });
  await db.auditEvent.create({
    data: {
      actorId,
      action: "review_appeal.dismissed",
      target: `review:${appeal.reviewId}`,
      reason: reason.trim(),
    },
  });
  return true;
}
