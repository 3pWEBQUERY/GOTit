"use server";

import { fileAnonymousReport } from "@app/core/moderation";
import { REPORT_REASONS, URGENT_REPORT_REASONS } from "@app/core/messaging/schemas";
import { consumeRateLimit } from "@app/core/rate-limit";
import { z } from "zod";
import type { ActionResult } from "../account/action-result";
import { ipSubject, platformHosts } from "./client-ip";

export interface PublicReportInput {
  url?: string;
  reason?: string;
  details?: string;
  contactEmail?: string;
  website?: string;
}

/**
 * Meldung ohne Konto über `/melden` (v2 7.8, Entscheid 0020): höchstens 5 pro
 * Stunde und Adresse (`publicReport`); nur Adressen dieser Plattform. Dringende
 * Gründe gehen sofort an Trust & Safety, sperren aber nichts automatisch.
 */
export async function submitPublicReportAction(input: PublicReportInput): Promise<ActionResult<{ urgent: boolean }>> {
  const errors: Record<string, string> = {};
  const url = (input.url ?? "").trim();
  if (!url) errors.url = "urlRequired";
  else if (url.length > 500) errors.url = "urlLong";
  const reason = REPORT_REASONS.find((value) => value === input.reason);
  if (!reason) errors.reason = "reasonRequired";
  const details = (input.details ?? "").trim();
  if (details.length > 2000) errors.details = "detailsLong";
  const contactEmail = (input.contactEmail ?? "").trim();
  if (contactEmail && (!z.email().safeParse(contactEmail).success || contactEmail.length > 254)) errors.contactEmail = "emailInvalid";
  if (Object.keys(errors).length > 0 || !reason) return { ok: false, fieldErrors: errors };
  const urgent = URGENT_REPORT_REASONS.includes(reason);
  if (input.website) return { ok: true, data: { urgent } };
  const limit = await consumeRateLimit("publicReport", await ipSubject("public-report"));
  if (!limit.allowed) return { ok: false, formError: "rateLimited", retryAfterSeconds: limit.retryAfterSeconds };
  const result = await fileAnonymousReport({ url, reason, details, contactEmail }, await platformHosts());
  if (!result.ok) return { ok: false, fieldErrors: { url: result.reason === "foreign-url" ? "urlForeign" : "urlInvalid" } };
  return { ok: true, data: { urgent } };
}
