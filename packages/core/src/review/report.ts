import { getDb, type Prisma } from "@app/db";
import { reportSchema } from "../messaging/schemas";
import { fileReport } from "../moderation/intake";

/**
 * Bewertung melden (v2 10.1 «Melden ist auf jeder Bewertung erreichbar»,
 * v1 FR-REVIEW-003). Jedes angemeldete Konto kann eine veröffentlichte
 * Bewertung melden; die Kopie des Texts hängt am Fall in der Moderation.
 */
export async function reportReview(
  userId: string,
  reviewId: string,
  input: unknown,
): Promise<
  | { ok: true; reportId: string }
  | { ok: false; reason: "invalid" | "not-found" }
> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success || reviewId.length > 64)
    return { ok: false, reason: "invalid" };
  const db = getDb();
  const review = await db.review.findFirst({
    where: { id: reviewId, status: "PUBLISHED" },
    select: { id: true, text: true, publishedAt: true },
  });
  if (!review) return { ok: false, reason: "not-found" };
  const report = await fileReport({
      reporterId: userId,
      targetType: "REVIEW",
      targetId: review.id,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
      evidence: {
        text: review.text,
        publishedAt: review.publishedAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
  });
  return { ok: true, reportId: report.reportId };
}
