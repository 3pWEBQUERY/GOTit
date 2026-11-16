import type { Locale } from "@app/core/locale";
import { redirect } from "@/i18n/navigation";
import { getReturnPath } from "../shell/queries/get-return-path";
import { getViewer } from "../shell/queries/get-viewer";
import { isAgeConfirmed } from "./queries/is-age-confirmed";

/** Beschränkte Bereiche (Marktplatz, Community) erst nach der Altersprüfung (PRD 7.1). */
export async function requireAgeConfirmed(locale: Locale): Promise<void> {
  if (await isAgeConfirmed(await getViewer())) return;
  const weiter = await getReturnPath();
  redirect({ href: { pathname: "/alterspruefung", query: weiter ? { weiter } : {} }, locale });
}
