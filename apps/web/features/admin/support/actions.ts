"use server";

import { assignTicket, replyToTicket, setTicketStatus, type SupportResult } from "@app/core/support";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { adminAction, flag, text } from "../areas/run-action";

/** Server Actions des Supports (v2 7.8 `/admin/support`). Recht `support.handle` prüft der Kern. */
const ERRORS: Record<Extract<SupportResult, { ok: false }>["reason"], string> = { invalid: "invalid", "not-found": "notFound", "not-applicable": "assigneeNotSupport" };

function done(result: SupportResult): ActionResult {
  if (!result.ok) return { ok: false, formError: ERRORS[result.reason] };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function replyAction(ticketId: string, values: unknown): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const body = text(values, "body").trim();
    if (!body) return { ok: false, fieldErrors: { body: "required" } };
    if (body.length > 5000) return { ok: false, fieldErrors: { body: "tooLong" } };
    return done(await replyToTicket(actorId, ticketId, { body, internal: flag(values, "internal") }));
  });
}

export async function setStatusAction(ticketId: string, values: unknown): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const status = text(values, "status");
    if (!["OPEN", "ANSWERED", "CLOSED"].includes(status)) return { ok: false, fieldErrors: { status: "required" } };
    return done(await setTicketStatus(actorId, ticketId, status));
  });
}

export async function assignAction(ticketId: string, toMe: boolean): Promise<ActionResult> {
  return adminAction(async (actorId) => done(await assignTicket(actorId, ticketId, toMe ? actorId : null)));
}
