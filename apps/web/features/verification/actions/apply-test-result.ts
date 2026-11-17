"use server";

import { safeReturnPath } from "@app/core/age-gate";
import { isLocale } from "@app/core/locale";
import { applyIdentityResult } from "@app/core/verification";
import { getDb } from "@app/db";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "../../shell/queries/get-viewer";
import { TEST_OUTCOMES, isTestProviderEnabled, type TestOutcome } from "../test-provider";

/**
 * Ergebnis des Test-Dienstleisters. Nur ausserhalb der Produktion und nur für
 * eine Prüfung des angemeldeten Kontos; danach zurück zu `?weiter`.
 */
export async function applyTestResultAction(formData: FormData): Promise<void> {
  if (!isTestProviderEnabled()) notFound();
  const ref = String(formData.get("ref") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const localeInput = String(formData.get("locale") ?? "");
  const locale = isLocale(localeInput) ? localeInput : "de";
  if (!(outcome in TEST_OUTCOMES)) notFound();
  const viewer = await getViewer();
  const check = await getDb().identityCheck.findUnique({
    where: { externalRef: ref },
    select: { userId: true },
  });
  if (viewer.kind !== "account" || !check || check.userId !== viewer.userId) notFound();
  await applyIdentityResult(ref, TEST_OUTCOMES[outcome as TestOutcome]);
  revalidatePath("/", "layout");
  redirect(safeReturnPath(String(formData.get("weiter") ?? ""), `/${locale}/studio`));
}
