"use server";

import { getDb } from "@app/db";
import { isLocale } from "@app/core/locale";
import { consumeRateLimit } from "@app/core/rate-limit";
import { SUPPORT_CATEGORIES, createSupportTicket, ticketReference } from "@app/core/support";
import { z } from "zod";
import type { ActionResult } from "../account/action-result";
import { getViewer } from "../shell/queries/get-viewer";
import { ipSubject } from "./client-ip";

export interface ContactInput {
  category?: string;
  email?: string;
  subject?: string;
  message?: string;
  locale?: string;
  /** Feld für Bots; Menschen sehen es nicht. */
  website?: string;
}

/**
 * Anfrage über `/kontakt` (v2 7.8, Entscheid 0022): ohne Konto möglich, mit
 * Konto gilt dessen E-Mail-Adresse. Höchstens 5 pro Stunde und Adresse
 * (`supportTicket`). Ein ausgefülltes Bot-Feld ergibt scheinbar Erfolg, legt
 * aber nichts an.
 */
export async function submitContactAction(input: ContactInput): Promise<ActionResult<{ reference: string | null; email: string }>> {
  const viewer = await getViewer();
  const errors: Record<string, string> = {};
  const category = SUPPORT_CATEGORIES.find((value) => value === input.category);
  if (!category) errors.category = "categoryRequired";
  let email = (input.email ?? "").trim();
  if (viewer.kind === "account") email = (await getDb().user.findUnique({ where: { id: viewer.userId }, select: { email: true } }))?.email ?? email;
  else if (!email) errors.email = "emailRequired";
  else if (!z.email().safeParse(email).success || email.length > 254) errors.email = "emailInvalid";
  const subject = (input.subject ?? "").trim();
  if (subject.length < 3) errors.subject = subject ? "subjectShort" : "subjectRequired";
  else if (subject.length > 150) errors.subject = "subjectLong";
  const message = (input.message ?? "").trim();
  if (message.length < 20) errors.message = message ? "messageShort" : "messageRequired";
  else if (message.length > 5000) errors.message = "messageLong";
  if (Object.keys(errors).length > 0 || !category) return { ok: false, fieldErrors: errors };
  if (input.website) return { ok: true, data: { reference: null, email } };
  const limit = await consumeRateLimit("supportTicket", await ipSubject("support-ticket"));
  if (!limit.allowed) return { ok: false, formError: "rateLimited", retryAfterSeconds: limit.retryAfterSeconds };
  const result = await createSupportTicket({
    userId: viewer.kind === "account" ? viewer.userId : null,
    email,
    category,
    subject,
    body: message,
    locale: isLocale(input.locale ?? "") ? (input.locale as "de") : "de",
  });
  if (!result.ok) return { ok: false, formError: "generic" };
  return { ok: true, data: { reference: ticketReference(result.number), email } };
}
