"use server";

import { preferenceSchema, updateOwnPreferences, type OwnPreferences } from "@app/core/account";
import { cookies } from "next/headers";
import { MOTION_COOKIE, NEUTRAL_TITLE_COOKIE } from "../../appearance/preference-cookies";
import { THEME_COOKIE } from "../../appearance/theme";
import { getViewer } from "../../shell/queries/get-viewer";
import type { ActionResult } from "../action-result";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Schalter speichern sofort (PRD 13). Darstellung wirkt zusätzlich über Cookies,
 * damit sie schon beim ersten Rendern stimmt.
 */
export async function updatePreference(input: unknown): Promise<ActionResult<OwnPreferences>> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, formError: "signInRequired" };
  const parsed = preferenceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, formError: "invalidInput" };
  try {
    const preferences = await updateOwnPreferences(viewer.userId, parsed.data);
    const store = await cookies();
    const options = { path: "/", maxAge: ONE_YEAR, sameSite: "lax" as const };
    if (parsed.data.theme) store.set(THEME_COOKIE, parsed.data.theme, options);
    if (parsed.data.reducedMotion !== undefined) store.set(MOTION_COOKIE, parsed.data.reducedMotion ? "reduced" : "auto", options);
    if (parsed.data.neutralTabTitle !== undefined) store.set(NEUTRAL_TITLE_COOKIE, parsed.data.neutralTabTitle ? "1" : "0", options);
    return { ok: true, data: preferences };
  } catch (error) {
    if (error instanceof Error && error.message === "notification-locked") return { ok: false, formError: "notificationLocked" };
    throw error;
  }
}
