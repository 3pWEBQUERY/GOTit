import { getDb, Prisma, type ReviewStatus } from "@app/db";
import type { Viewer } from "../identity/types";
import { participantOf } from "../messaging/access";
import { requestSearchReindex } from "../search/reindex";
import {
  REVIEW_WINDOW_DAYS,
  appealSchema,
  responseSchema,
  reviewSchema,
} from "./schemas";

const DAY = 24 * 3600_000;

/**
 * Bewertungen (PRD v1 5.9, Abnahme 1.10). Eine Bewertung braucht einen über
 * die Plattform als stattgefunden bestätigten Termin; der Autor ist dessen
 * Mitglied; pro Termin gibt es genau eine. Die Datenbank prüft das zusätzlich
 * per Trigger, damit es auch an jedem anderen Weg vorbei gilt. Öffentlich wird
 * eine Bewertung erst nach der Moderation.
 */
export type ReviewEligibility =
  | {
      eligible: true;
      bookingRequestId: string;
      providerProfileId: string;
      providerName: string;
      endsAt: Date;
    }
  | {
      eligible: false;
      reason:
        | "not-found"
        | "not-completed"
        | "not-member"
        | "already-reviewed"
        | "too-late";
    };

export async function reviewEligibility(
  userId: string,
  bookingRequestId: string,
  now = new Date(),
): Promise<ReviewEligibility> {
  if (bookingRequestId.length > 64)
    return { eligible: false, reason: "not-found" };
  const db = getDb();
  const booking = await db.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    select: {
      id: true,
      status: true,
      memberUserId: true,
      endsAt: true,
      conversationId: true,
      providerProfile: { select: { id: true, displayName: true } },
      review: { select: { id: true } },
    },
  });
  if (!booking || !(await participantOf(userId, booking.conversationId)))
    return { eligible: false, reason: "not-found" };
  if (booking.memberUserId !== userId)
    return { eligible: false, reason: "not-member" };
  if (booking.status !== "COMPLETED")
    return { eligible: false, reason: "not-completed" };
  if (booking.review) return { eligible: false, reason: "already-reviewed" };
  if (now.getTime() > booking.endsAt.getTime() + REVIEW_WINDOW_DAYS * DAY)
    return { eligible: false, reason: "too-late" };
  return {
    eligible: true,
    bookingRequestId: booking.id,
    providerProfileId: booking.providerProfile.id,
    providerName: booking.providerProfile.displayName,
    endsAt: booking.endsAt,
  };
}

export type CreateReviewResult =
  | { ok: true; reviewId: string }
  | {
      ok: false;
      reason:
        | "invalid"
        | "not-allowed"
        | Exclude<ReviewEligibility, { eligible: true }>["reason"];
    };

export async function createReview(
  viewer: Viewer,
  bookingRequestId: string,
  input: unknown,
  now = new Date(),
): Promise<CreateReviewResult> {
  if (viewer.kind !== "account") return { ok: false, reason: "not-allowed" };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const eligibility = await reviewEligibility(
    viewer.userId,
    bookingRequestId,
    now,
  );
  if (!eligibility.eligible) return { ok: false, reason: eligibility.reason };
  try {
    const review = await getDb().review.create({
      data: {
        bookingRequestId,
        providerProfileId: eligibility.providerProfileId,
        authorUserId: viewer.userId,
        ...parsed.data,
      },
      select: { id: true },
    });
    return { ok: true, reviewId: review.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return { ok: false, reason: "already-reviewed" };
    throw error;
  }
}

async function ownProviderReview(userId: string, reviewId: string) {
  if (reviewId.length > 64) return null;
  return getDb().review.findFirst({
    where: { id: reviewId, providerProfile: { userId } },
    select: { id: true, status: true },
  });
}

/** Stellungnahme des Anbieters (v1 FR-REVIEW-003); leer entfernt sie. Nur zu veröffentlichten Bewertungen. */
export async function respondToReview(
  userId: string,
  reviewId: string,
  input: unknown,
  now = new Date(),
): Promise<
  | { ok: true }
  | { ok: false; reason: "invalid" | "not-found" | "not-published" }
> {
  const parsed = responseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const review = await ownProviderReview(userId, reviewId);
  if (!review) return { ok: false, reason: "not-found" };
  if (review.status !== "PUBLISHED")
    return { ok: false, reason: "not-published" };
  await getDb().review.update({
    where: { id: review.id },
    data: {
      response: parsed.data || null,
      respondedAt: parsed.data ? now : null,
    },
  });
  return { ok: true };
}

/**
 * Einspruch (v1 FR-REVIEW-003): der Anbieter gegen eine veröffentlichte
 * Bewertung, der Autor gegen eine abgelehnte oder entfernte. Ein offener
 * Einspruch pro Bewertung und Seite.
 */
export async function appealReview(
  userId: string,
  reviewId: string,
  input: unknown,
): Promise<
  | { ok: true }
  | { ok: false; reason: "invalid" | "not-found" | "not-allowed" | "open" }
> {
  const parsed = appealSchema.safeParse(input);
  if (!parsed.success || reviewId.length > 64)
    return { ok: false, reason: "invalid" };
  const db = getDb();
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      status: true,
      authorUserId: true,
      providerProfile: { select: { userId: true } },
    },
  });
  if (!review) return { ok: false, reason: "not-found" };
  const role =
    review.authorUserId === userId
      ? "MEMBER"
      : review.providerProfile.userId === userId
        ? "PROVIDER"
        : null;
  if (!role) return { ok: false, reason: "not-found" };
  const allowed: Record<typeof role, ReviewStatus[]> = {
    PROVIDER: ["PUBLISHED"],
    MEMBER: ["REJECTED", "REMOVED"],
  };
  if (!allowed[role].includes(review.status))
    return { ok: false, reason: "not-allowed" };
  if (
    (await db.reviewAppeal.count({
      where: { reviewId, byRole: role, status: "OPEN" },
    })) > 0
  )
    return { ok: false, reason: "open" };
  await db.reviewAppeal.create({
    data: { reviewId, byRole: role, reason: parsed.data },
  });
  return { ok: true };
}

export interface PublicReview {
  id: string;
  ratings: {
    communication: number;
    accuracy: number;
    organization: number;
    overall: number;
  };
  text: string;
  /** Verifikationsart (v1 FR-REVIEW-004): immer «nach bestätigtem Termin». */
  verification: "completed-booking";
  publishedAt: Date;
  response: { text: string; respondedAt: Date } | null;
}

/** Veröffentlichte Bewertungen eines Profils, neueste zuerst. Ohne Namen des Autors. */
export async function listPublicReviews(
  providerProfileId: string,
  limit = 50,
): Promise<{ total: number; reviews: PublicReview[] }> {
  const db = getDb();
  const where = {
    providerProfileId,
    status: "PUBLISHED" as const,
    publishedAt: { not: null },
  };
  const [total, rows] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true,
        communication: true,
        accuracy: true,
        organization: true,
        overall: true,
        text: true,
        publishedAt: true,
        response: true,
        respondedAt: true,
      },
    }),
  ]);
  return {
    total,
    reviews: rows.map((row) => ({
      id: row.id,
      ratings: {
        communication: row.communication,
        accuracy: row.accuracy,
        organization: row.organization,
        overall: row.overall,
      },
      text: row.text,
      verification: "completed-booking",
      publishedAt: row.publishedAt ?? new Date(0),
      response:
        row.response && row.respondedAt
          ? { text: row.response, respondedAt: row.respondedAt }
          : null,
    })),
  };
}

/** Eigene Bewertungen eines Mitglieds (`/bewertungen`), mit Status, und offene Termine zum Bewerten. */
export async function listOwnReviews(userId: string, now = new Date()) {
  const db = getDb();
  const [written, pending] = await Promise.all([
    db.review.findMany({
      where: { authorUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        overall: true,
        text: true,
        createdAt: true,
        publishedAt: true,
        response: true,
        providerProfile: { select: { slug: true, displayName: true } },
        appeals: { where: { byRole: "MEMBER" }, select: { status: true } },
      },
    }),
    db.bookingRequest.findMany({
      where: {
        memberUserId: userId,
        status: "COMPLETED",
        review: null,
        endsAt: { gt: new Date(now.getTime() - REVIEW_WINDOW_DAYS * DAY) },
      },
      orderBy: { endsAt: "desc" },
      select: {
        id: true,
        endsAt: true,
        providerProfile: { select: { slug: true, displayName: true } },
      },
    }),
  ]);
  return { written, pending };
}

/** Erhaltene Bewertungen eines Anbieters (`/studio/bewertungen`). Ohne Autor; die Prüfung der Echtheit liegt bei der Moderation. */
export async function listReceivedReviews(userId: string) {
  return getDb().review.findMany({
    where: {
      providerProfile: { userId },
      status: { in: ["PUBLISHED", "REMOVED"] },
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      status: true,
      communication: true,
      accuracy: true,
      organization: true,
      overall: true,
      text: true,
      publishedAt: true,
      response: true,
      respondedAt: true,
      appeals: {
        where: { byRole: "PROVIDER" },
        select: { status: true, createdAt: true },
      },
    },
  });
}

/** Nach jeder Änderung der Sichtbarkeit: Zähler im Suchindex nachziehen. */
export async function reindexReviewedProfile(
  providerProfileId: string,
): Promise<void> {
  await requestSearchReindex(providerProfileId);
}
