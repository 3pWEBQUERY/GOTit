"use server";

import { setCategoryApproved, upsertCategory, type CategoryResult } from "@app/core/catalog/admin";
import type { Locale } from "@app/core/locale";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { createHref } from "../../shell/nav/href";
import { adminAction, reasonError, text } from "../areas/run-action";

/** Server Actions der Kategorien (v1 9.5). Recht `categories.manage` prüft der Kern. */
const ERRORS: Record<Extract<CategoryResult, { ok: false }>["reason"], string> = { invalid: "invalid", "not-found": "notFound", "slug-taken": "slugTaken" };
const NAMES = ["nameDe", "nameFr", "nameIt", "nameEn"] as const;

export async function upsertCategoryAction(locale: Locale, id: string | null, values: unknown): Promise<ActionResult<{ redirectTo?: string }>> {
  return adminAction(async (actorId) => {
    const errors: Record<string, string> = {};
    const slug = text(values, "slug").trim();
    if (!slug) errors.slug = "required";
    else if (!/^[a-z0-9-]{2,40}$/.test(slug)) errors.slug = "slugFormat";
    for (const name of NAMES) {
      const value = text(values, name).trim();
      if (!value) errors[name] = "required";
      else if (value.length > 60) errors[name] = "tooLong";
    }
    const orderText = text(values, "sortOrder").trim();
    const sortOrder = Number(orderText);
    if (!orderText || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) errors.sortOrder = "orderInvalid";
    if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
    const result = await upsertCategory(actorId, {
      ...(id ? { id } : {}),
      slug,
      nameDe: text(values, "nameDe"),
      nameFr: text(values, "nameFr"),
      nameIt: text(values, "nameIt"),
      nameEn: text(values, "nameEn"),
      sortOrder,
    });
    if (!result.ok) return result.reason === "slug-taken" ? { ok: false, fieldErrors: { slug: "slugTaken" } } : { ok: false, formError: ERRORS[result.reason] };
    revalidatePath("/", "layout");
    return { ok: true, data: id ? {} : { redirectTo: createHref(locale)({ pathname: "/admin/kategorien", query: { bearbeiten: result.id } }) } };
  });
}

export async function setCategoryApprovedAction(id: string, approved: boolean, values: unknown): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const reason = text(values, "reason");
    const problem = reasonError(reason, 10, 500);
    if (problem) return { ok: false, fieldErrors: { reason: problem } };
    const result = await setCategoryApproved(actorId, id, approved, reason);
    if (!result.ok) return { ok: false, formError: ERRORS[result.reason] };
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
