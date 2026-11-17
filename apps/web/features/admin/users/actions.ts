"use server";

import { setInternalRoles } from "@app/core/admin";
import { MODERATION_RULE_KEYS, liftRestriction, restrictAccount } from "@app/core/moderation";
import { InternalRole } from "@app/db";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { untilFromDay } from "../moderation/until";
import { adminAction, list, reasonError, text } from "../areas/run-action";

/**
 * Server Actions der Benutzerverwaltung (v1 9.2). Das Recht prüft der Kern
 * (`users.restrict`, `users.suspend`, `roles.manage`); hier nur Eingaben und
 * die Zuordnung der Ergebnisse zu Fehlern unter `adminCommon.errors`.
 */
const RESTRICTION_ERRORS = {
  invalid: "invalid",
  "not-found": "notFound",
  self: "restrictionSelf",
  protected: "restrictionProtected",
  "already-active": "restrictionActive",
  "past-end": "datePast",
} as const;

export async function restrictAccountAction(userId: string, kind: "LIMIT" | "SUSPENDED", values: unknown): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const errors: Record<string, string> = {};
    const restriction = kind === "SUSPENDED" ? "SUSPENDED" : text(values, "kind");
    if (!["MESSAGING", "BOOKING", "SUSPENDED"].includes(restriction)) errors.kind = "required";
    const rule = text(values, "rule");
    if (!(MODERATION_RULE_KEYS as readonly string[]).includes(rule) || rule === "R-MOD-0") errors.rule = "required";
    const reason = text(values, "reason");
    const reasonProblem = reasonError(reason, 10, 1000);
    if (reasonProblem) errors.reason = reasonProblem;
    const day = text(values, "until");
    const until = untilFromDay(day);
    if (day && !until) errors.until = "dateInvalid";
    else if (until && until.getTime() <= Date.now()) errors.until = "datePast";
    if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
    const result = await restrictAccount(actorId, { userId, kind: restriction as "MESSAGING" | "BOOKING" | "SUSPENDED", rule: rule as (typeof MODERATION_RULE_KEYS)[number], reason, until });
    if (!result.ok) return result.reason === "past-end" ? { ok: false, fieldErrors: { until: "datePast" } } : { ok: false, formError: RESTRICTION_ERRORS[result.reason] };
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function liftRestrictionAction(restrictionId: string, values: unknown): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const reason = text(values, "reason");
    const problem = reasonError(reason, 10, 1000);
    if (problem) return { ok: false, fieldErrors: { reason: problem } };
    const result = await liftRestriction(actorId, restrictionId, reason);
    if (!result.ok) return { ok: false, formError: result.reason === "invalid" ? "invalid" : "restrictionGone" };
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

const ROLE_ERRORS = { invalid: "invalid", "not-found": "notFound", "self-super-admin": "rolesSelf", "last-super-admin": "rolesLast" } as const;
const ROLES = Object.values(InternalRole) as string[];

export async function setRolesAction(userId: string, values: unknown): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const roles = list(values, "roles").filter((role) => ROLES.includes(role)) as InternalRole[];
    const reason = text(values, "reason");
    const problem = reasonError(reason, 10, 500);
    if (problem) return { ok: false, fieldErrors: { reason: problem } };
    const result = await setInternalRoles(actorId, userId, roles, reason);
    if (!result.ok) return { ok: false, formError: ROLE_ERRORS[result.reason] };
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
