import { z } from "zod";

/** Eingaben der Bewertungen (PRD v1 5.9, v2 12.1). Browsertauglich. */
export const REVIEW_TEXT_MIN = 20;
export const REVIEW_TEXT_MAX = 2000;
export const RESPONSE_MAX = 1000;
export const APPEAL_MAX = 1000;
/** So lange nach dem Termin lässt sich eine Bewertung schreiben. */
export const REVIEW_WINDOW_DAYS = 30;
export const REVIEW_CATEGORIES = [
  "communication",
  "accuracy",
  "organization",
  "overall",
] as const;
export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];

const rating = z.number().int().min(1, "rating").max(5, "rating");

export const reviewSchema = z.object({
  communication: rating,
  accuracy: rating,
  organization: rating,
  overall: rating,
  text: z
    .string()
    .transform((value) => value.replace(/\r\n/g, "\n").trim())
    .pipe(
      z
        .string()
        .min(REVIEW_TEXT_MIN, "too-short")
        .max(REVIEW_TEXT_MAX, "too-long"),
    ),
});
export type ReviewInput = z.input<typeof reviewSchema>;

export const responseSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().max(RESPONSE_MAX, "too-long"));

export const appealSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(10, "too-short").max(APPEAL_MAX, "too-long"));

export const moderationSchema = z.object({
  decision: z.enum(["PUBLISHED", "REJECTED", "REMOVED"]),
  // Grund als Schlüssel (Regel) und Begründung, wie bei Profil- und Medienentscheiden.
  rule: z.enum(["R-REV-1", "R-REV-2", "R-REV-3", "R-REV-4", "R-REV-5"]),
  reason: z.string().trim().min(10).max(1000),
});

/**
 * Regeln der Moderation (v1 FR-REVIEW-002/003/005):
 * R-REV-1 zulässig; R-REV-2 intime oder besonders sensible Details;
 * R-REV-3 Angaben, die jemanden identifizieren oder gefährden;
 * R-REV-4 rechtswidrig oder persönlichkeitsverletzend; R-REV-5 Erpressung,
 * Vergeltung oder Manipulation.
 */
export const REVIEW_RULES = [
  "R-REV-1",
  "R-REV-2",
  "R-REV-3",
  "R-REV-4",
  "R-REV-5",
] as const;
