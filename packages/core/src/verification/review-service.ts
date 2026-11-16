import { getDb, type Prisma, type ReviewDecision } from "@app/db";
import { z } from "zod";
import { canApprove } from "./policy";

/** Rollen, die Profile prüfen und freigeben dürfen (PRD 3, 7.8). */
export const REVIEWER_ROLES = ["SUPER_ADMIN", "PLATFORM_ADMIN", "TRUST_SAFETY", "MODERATOR"] as const;

export const reviewDecisionSchema = z
  .object({
    decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
    reason: z.string().trim().min(10, "reasonTooShort").max(2000),
    rule: z.string().trim().min(1, "ruleRequired").max(120),
    fieldNotes: z.partialRecord(z.enum(["regions", "profile", "offer", "media", "availability"]), z.string().trim().min(3).max(500)).default({}),
  })
  .refine((input) => input.decision !== "CHANGES_REQUESTED" || Object.keys(input.fieldNotes).length > 0, {
    path: ["fieldNotes"],
    message: "fieldNotesRequired",
  });
export type ReviewDecisionInput = z.input<typeof reviewDecisionSchema>;

/** Offene Fälle, älteste zuerst. Ohne Prüfdetails; die liegen hinter `revealIdentityDetails`. */
export async function listOpenReviews() {
  return getDb().profileReview.findMany({
    where: { decision: null },
    orderBy: { submittedAt: "asc" },
    select: { id: true, submittedAt: true, assignedToId: true, providerProfile: { select: { slug: true, displayName: true, status: true } } },
  });
}

export async function getReviewCase(reviewId: string) {
  return getDb().profileReview.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      submittedAt: true,
      decision: true,
      decidedAt: true,
      reason: true,
      rule: true,
      fieldNotes: true,
      providerProfile: {
        select: {
          id: true,
          userId: true,
          slug: true,
          displayName: true,
          description: true,
          languages: true,
          status: true,
          regions: { select: { region: { select: { nameDe: true } } } },
          rates: { orderBy: { sortOrder: "asc" }, select: { durationMinutes: true, priceChf: true, note: true } },
          reviews: { orderBy: { submittedAt: "desc" }, take: 5, select: { id: true, decision: true, decidedAt: true, reason: true } },
        },
      },
    },
  });
}

/** Aufdecken der Prüfdetails verlangt einen Grund und erzeugt einen Audit-Eintrag (PRD 12.4). */
export async function revealIdentityDetails(actorId: string, reviewId: string, reason: string) {
  const parsed = z.string().trim().min(10).max(500).parse(reason);
  const db = getDb();
  const review = await db.profileReview.findUniqueOrThrow({ where: { id: reviewId }, select: { providerProfile: { select: { userId: true } } } });
  await db.auditEvent.create({ data: { actorId, action: "identity.reveal", target: `profile_review:${reviewId}`, reason: parsed } });
  return db.identityCheck.findFirst({
    where: { userId: review.providerProfile.userId },
    orderBy: { createdAt: "desc" },
    select: { status: true, provider: true, ageOver18: true, livenessPassed: true, checkedAt: true, expiresAt: true, failureReason: true },
  });
}

export type DecideReviewResult = { ok: true } | { ok: false; reason: "not-open" | "identity-invalid" };

/**
 * Entscheid über einen Fall: Begründung und Regel sind Pflicht, jeder Entscheid
 * landet im Audit-Log. Freigeben prüft die Identität erneut zum Zeitpunkt des
 * Entscheids (PRD 16.1).
 */
export async function decideReview(actorId: string, reviewId: string, input: unknown, now = new Date()): Promise<DecideReviewResult> {
  const data = reviewDecisionSchema.parse(input);
  const db = getDb();
  const review = await db.profileReview.findUniqueOrThrow({
    where: { id: reviewId },
    select: { decision: true, providerProfile: { select: { id: true, userId: true, status: true } } },
  });
  if (review.decision !== null) return { ok: false, reason: "not-open" };
  const profile = review.providerProfile;
  if (data.decision === "APPROVED") {
    const identity = await db.identityCheck.findFirst({ where: { userId: profile.userId }, orderBy: { createdAt: "desc" } });
    if (!canApprove(profile.status, identity, now)) return { ok: false, reason: "identity-invalid" };
  }
  const nextStatus = { APPROVED: "PUBLISHED", CHANGES_REQUESTED: "CHANGES_REQUESTED", REJECTED: "SUSPENDED" } as const satisfies Record<ReviewDecision, string>;
  await db.$transaction([
    db.profileReview.update({
      where: { id: reviewId },
      data: { decision: data.decision, decidedAt: now, decidedById: actorId, reason: data.reason, rule: data.rule, fieldNotes: data.fieldNotes as Prisma.InputJsonValue },
    }),
    db.providerProfile.update({
      where: { id: profile.id },
      data: { status: nextStatus[data.decision], ...(data.decision === "APPROVED" ? { publishedAt: now } : {}) },
    }),
    db.auditEvent.create({ data: { actorId, action: `profile_review.${data.decision.toLowerCase()}`, target: `profile_review:${reviewId}`, reason: `${data.rule}: ${data.reason}` } }),
  ]);
  return { ok: true };
}
