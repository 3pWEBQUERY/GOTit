"use server";

import { AGE_COOKIE_NAME, createAgeToken, safeReturnPath } from "@app/core/age-gate";
import { confirmAccountAge } from "@app/core/identity";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer } from "../../shell/queries/get-viewer";
import { confirmAgeSchema } from "../schemas";

/**
 * Hält die Selbstauskunft «mindestens 18 Jahre» fest: als signiertes
 * Sitzungs-Cookie und, falls angemeldet, im Konto. Danach geht es zurück zum
 * ursprünglichen Ziel; fremde Ziele sind ausgeschlossen.
 */
export async function confirmAge(formData: FormData): Promise<void> {
  const input = confirmAgeSchema.parse({
    locale: formData.get("locale"),
    weiter: formData.get("weiter") || undefined,
  });
  (await cookies()).set(AGE_COOKIE_NAME, createAgeToken(process.env.AGE_GATE_SECRET), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  const viewer = await getViewer();
  if (viewer.kind === "account") await confirmAccountAge(viewer.userId);
  redirect(safeReturnPath(input.weiter, `/${input.locale}`));
}
