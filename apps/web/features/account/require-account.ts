import type { AccountViewer } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { redirect } from "@/i18n/navigation";
import { getReturnPath } from "../shell/queries/get-return-path";
import { getViewer } from "../shell/queries/get-viewer";

/** Geschützte Seiten: Unangemeldete gehen zu `/anmelden?weiter=<pfad>` und danach zurück (PRD 8.2). */
export async function requireAccount(locale: Locale): Promise<AccountViewer> {
  const viewer = await getViewer();
  if (viewer.kind === "account") return viewer;
  const weiter = await getReturnPath();
  return redirect({ href: { pathname: "/anmelden", query: weiter ? { weiter } : {} }, locale });
}
