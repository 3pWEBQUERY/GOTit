"use server";

import { deleteSeoOverride, saveSeoOverride } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { createHref } from "../../shell/nav/href";
import { adminAction, flag, text } from "../areas/run-action";

/** Server Actions der Metadaten (v2 7.8 `/admin/seo`). Recht `content.manage` prüft der Kern. */
export async function saveSeoAction(locale: Locale, values: unknown): Promise<ActionResult<{ redirectTo?: string }>> {
  return adminAction(async (actorId) => {
    const errors: Record<string, string> = {};
    const path = text(values, "path").trim();
    if (!path) errors.path = "required";
    else if (path.length > 200 || !/^\/[A-Za-z0-9\-._~/%]*$/.test(path)) errors.path = "seoPath";
    const pathLocale = text(values, "locale");
    if (!["de", "fr", "it", "en"].includes(pathLocale)) errors.locale = "required";
    if (text(values, "title").trim().length > 70) errors.title = "tooLong";
    if (text(values, "description").trim().length > 160) errors.description = "tooLong";
    if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
    const result = await saveSeoOverride(actorId, { path, locale: pathLocale as Locale, title: text(values, "title"), description: text(values, "description"), noindex: flag(values, "noindex") });
    if (!result.ok) return { ok: false, formError: "invalid" };
    revalidatePath("/", "layout");
    return { ok: true, data: { redirectTo: createHref(locale)("/admin/seo") } };
  });
}

export async function deleteSeoAction(path: string, pathLocale: string): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const result = await deleteSeoOverride(actorId, path, pathLocale);
    if (!result.ok) return { ok: false, formError: result.reason === "not-found" ? "notFound" : "invalid" };
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
