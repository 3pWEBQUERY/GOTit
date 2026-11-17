"use server";

import { deleteContentPage, saveContentPage, setContentPublished, type ContentResult } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../account/action-result";
import { createHref } from "../../shell/nav/href";
import { adminAction, flag, text } from "../areas/run-action";

/** Server Actions des CMS (v2 7.8 `/admin/inhalte`). Recht `content.manage` prüft der Kern. */
const ERRORS: Record<Extract<ContentResult, { ok: false }>["reason"], string> = { invalid: "invalid", "not-found": "notFound", "slug-taken": "contentSlugTaken" };
const KINDS = ["HELP", "LEGAL", "PAGE"] as const;
const LOCALES = ["de", "fr", "it", "en"] as const;

function contentErrors(values: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!(KINDS as readonly string[]).includes(text(values, "kind"))) errors.kind = "required";
  if (!(LOCALES as readonly string[]).includes(text(values, "locale"))) errors.locale = "required";
  const slug = text(values, "slug").trim();
  if (!slug) errors.slug = "required";
  else if (!/^[a-z0-9-]{1,80}$/.test(slug)) errors.slug = "slugFormat";
  const title = text(values, "title").trim();
  if (!title) errors.title = "required";
  else if (title.length > 120) errors.title = "tooLong";
  if (text(values, "summary").trim().length > 300) errors.summary = "tooLong";
  if (text(values, "body").length > 50_000) errors.body = "tooLong";
  if (text(values, "metaTitle").trim().length > 70) errors.metaTitle = "tooLong";
  if (text(values, "metaDescription").trim().length > 160) errors.metaDescription = "tooLong";
  return errors;
}

export async function saveContentAction(locale: Locale, id: string | null, values: unknown): Promise<ActionResult<{ redirectTo?: string }>> {
  return adminAction(async (actorId) => {
    const errors = contentErrors(values);
    if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
    const result = await saveContentPage(actorId, {
      ...(id ? { id } : {}),
      kind: text(values, "kind") as (typeof KINDS)[number],
      slug: text(values, "slug").trim(),
      locale: text(values, "locale") as (typeof LOCALES)[number],
      title: text(values, "title"),
      summary: text(values, "summary"),
      body: text(values, "body"),
      metaTitle: text(values, "metaTitle"),
      metaDescription: text(values, "metaDescription"),
      publish: !id && flag(values, "publish"),
    });
    if (!result.ok) return result.reason === "slug-taken" ? { ok: false, fieldErrors: { slug: "contentSlugTaken" } } : { ok: false, formError: ERRORS[result.reason] };
    revalidatePath("/", "layout");
    return { ok: true, data: id ? {} : { redirectTo: createHref(locale)({ pathname: "/admin/inhalte/[id]", params: { id: result.id } }) } };
  });
}

export async function setContentPublishedAction(id: string, published: boolean): Promise<ActionResult> {
  return adminAction(async (actorId) => {
    const result = await setContentPublished(actorId, id, published);
    if (!result.ok) return { ok: false, formError: ERRORS[result.reason] };
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function deleteContentAction(locale: Locale, id: string): Promise<ActionResult<{ redirectTo?: string }>> {
  return adminAction(async (actorId) => {
    const result = await deleteContentPage(actorId, id);
    if (!result.ok) return { ok: false, formError: ERRORS[result.reason] };
    revalidatePath("/", "layout");
    return { ok: true, data: { redirectTo: createHref(locale)("/admin/inhalte") } };
  });
}
