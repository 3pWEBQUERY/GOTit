"use server";

import { AdminForbiddenError } from "@app/core/admin";
import { MODERATION_RULE_KEYS, assignCase, decideCase, decideCaseAppeal, decideRestrictionAppeal, type CaseResult } from "@app/core/moderation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "../../account/action-result";
import { getViewer } from "../../shell/queries/get-viewer";
import { REASON_MAX, REASON_MIN } from "../moderation/decision-rules";
import { getNextCaseId } from "../moderation/queries";
import { untilFromDay } from "../moderation/until";

/**
 * Server Actions der Moderation (v2 12.4). Jede prüft die Anmeldung; das
 * Recht prüft der Kern bei jedem Aufruf selbst und wirft ohne Recht
 * `AdminForbiddenError`, was hier zum Formularfehler wird. Fehler sind
 * Schlüssel unter `moderation.errors`.
 */
type Guard = { ok: true; userId: string } | { ok: false; formError: string };

async function signedIn(): Promise<Guard> {
  const viewer = await getViewer();
  return viewer.kind === "account" ? { ok: true, userId: viewer.userId } : { ok: false, formError: "signInRequired" };
}

function isForbidden(error: unknown): boolean {
  return error instanceof AdminForbiddenError || (error instanceof Error && error.message.startsWith("forbidden:"));
}

/** Führt einen Aufruf des Kerns aus; fehlendes Recht wird zu `forbidden`. */
async function guarded<T>(run: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; formError: string }> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    if (isForbidden(error)) return { ok: false, formError: "forbidden" };
    throw error;
  }
}

const CASE_ERRORS: Record<Extract<CaseResult, { ok: false }>["reason"], string> = {
  invalid: "invalid",
  "not-found": "notFound",
  "already-decided": "alreadyDecided",
  "not-applicable": "notApplicable",
  "same-person": "samePerson",
  "no-account": "noAccount",
  protected: "protected",
};

const idSchema = z.string().min(1).max(64);
const reasonSchema = z.string().trim().min(REASON_MIN, "reasonTooShort").max(REASON_MAX, "reasonTooLong");

/** «Mir zuweisen» oder «Freigeben». */
export async function assignCaseAction(reportId: unknown, toMe: unknown): Promise<ActionResult> {
  const guard = await signedIn();
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(reportId).success) return { ok: false, formError: "notFound" };
  const result = await guarded(() => assignCase(guard.userId, String(reportId), toMe === true ? guard.userId : null));
  if (!result.ok) return result;
  if (!result.value.ok) return { ok: false, formError: CASE_ERRORS[result.value.reason] };
  revalidatePath("/", "layout");
  return { ok: true };
}

const DECISIONS = ["NO_ACTION", "CHANGES_REQUESTED", "CONTENT_REMOVED", "ACCOUNT_RESTRICTED", "ACCOUNT_SUSPENDED"] as const;

const decisionSchema = z.object({
  reportId: idSchema,
  decision: z.enum(DECISIONS, { error: "decisionRequired" }),
  rule: z.enum(MODERATION_RULE_KEYS, { error: "ruleRequired" }),
  reason: reasonSchema,
  restrictionKind: z.enum(["MESSAGING", "BOOKING"]).optional(),
  untilDay: z.string().max(10).nullable().optional(),
});

/** Prüft die Eingaben wie der Kern und liefert Fehler pro Feld. */
function decisionErrors(input: unknown): { data: z.infer<typeof decisionSchema> | null; errors: Record<string, string> } {
  const parsed = decisionSchema.safeParse(input);
  const errors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      errors[field] ??= field === "reportId" ? "notFound" : issue.message;
    }
    return { data: null, errors };
  }
  const data = parsed.data;
  if ((data.decision === "NO_ACTION") !== (data.rule === "R-MOD-0")) errors.rule = data.decision === "NO_ACTION" ? "ruleNoViolation" : "ruleViolation";
  if (data.decision === "ACCOUNT_RESTRICTED" && !data.restrictionKind) errors.restrictionKind = "kindRequired";
  const until = untilFromDay(data.untilDay);
  if (data.untilDay && !until) errors.until = "untilInvalid";
  if (until && until.getTime() <= Date.now()) errors.until = "untilPast";
  return { data, errors };
}

/**
 * Entscheid über einen Fall mit Regel und Begründung. Liefert den nächsten
 * Fall, damit die Oberfläche dorthin wechseln kann.
 */
export async function decideCaseAction(input: unknown): Promise<ActionResult<{ nextId: string | null }>> {
  const guard = await signedIn();
  if (!guard.ok) return guard;
  const { data, errors } = decisionErrors(input);
  if (errors.reportId) return { ok: false, formError: "notFound" };
  if (!data || Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  const measure = data.decision === "ACCOUNT_RESTRICTED" || data.decision === "ACCOUNT_SUSPENDED";
  const result = await guarded(() =>
    decideCase(guard.userId, data.reportId, {
      decision: data.decision,
      rule: data.rule,
      reason: data.reason,
      restrictionKind: data.decision === "ACCOUNT_RESTRICTED" ? data.restrictionKind : undefined,
      until: measure ? untilFromDay(data.untilDay) : null,
    }),
  );
  if (!result.ok) return result;
  if (!result.value.ok) return { ok: false, formError: CASE_ERRORS[result.value.reason] };
  revalidatePath("/", "layout");
  const nextId = await getNextCaseId(guard.userId, data.reportId).catch(() => null);
  return { ok: true, data: { nextId } };
}

const appealSchema = z.object({ id: idSchema, outcome: z.enum(["UPHELD", "DISMISSED"], { error: "outcomeRequired" }), reason: reasonSchema });

function appealErrors(input: unknown) {
  const parsed = appealSchema.safeParse(input);
  if (parsed.success) return { data: parsed.data, errors: {} as Record<string, string> };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
  return { data: null, errors };
}

/** Einspruch gegen einen Entscheid: stattgeben oder abweisen, nie durch die Person, die entschieden hat. */
export async function decideCaseAppealAction(input: unknown): Promise<ActionResult> {
  const guard = await signedIn();
  if (!guard.ok) return guard;
  const { data, errors } = appealErrors(input);
  if (errors.id) return { ok: false, formError: "notFound" };
  if (!data) return { ok: false, fieldErrors: errors };
  const result = await guarded(() => decideCaseAppeal(guard.userId, data.id, { outcome: data.outcome, reason: data.reason }));
  if (!result.ok) return result;
  if (!result.value.ok) return { ok: false, formError: result.value.reason === "not-found" ? "appealClosed" : CASE_ERRORS[result.value.reason] };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Einspruch gegen eine Einschränkung: stattgeben hebt sie auf (Vier-Augen-Prinzip im Kern). */
export async function decideRestrictionAppealAction(input: unknown): Promise<ActionResult> {
  const guard = await signedIn();
  if (!guard.ok) return guard;
  const { data, errors } = appealErrors(input);
  if (errors.id) return { ok: false, formError: "notFound" };
  if (!data) return { ok: false, fieldErrors: errors };
  const result = await guarded(() => decideRestrictionAppeal(guard.userId, data.id, { outcome: data.outcome, reason: data.reason }));
  if (!result.ok) return result;
  if (!result.value.ok) {
    const key = { invalid: "invalid", "not-found": "appealClosed", "same-person": "samePersonRestriction" } as const;
    return { ok: false, formError: key[result.value.reason ?? "invalid"] };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
