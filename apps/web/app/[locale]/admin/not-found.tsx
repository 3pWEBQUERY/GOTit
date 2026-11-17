import type { Locale } from "@app/core/locale";
import { getLocale } from "next-intl/server";
import { AppShell } from "@/features/shell/components/app-shell";
import { PageMain } from "@/features/shell/components/page-main";
import { NotFoundContent } from "@/features/system/components/not-found-content";

/**
 * Ohne interne Rolle sieht `/admin` aus wie jede unbekannte Seite des
 * Marktplatzes; nichts verrät, dass es einen Admin gibt (PRD 16.2).
 */
export default async function AdminHiddenNotFound() {
  const locale = (await getLocale()) as Locale;
  return (
    <AppShell locale={locale}>
      <PageMain>
        <NotFoundContent locale={locale} />
      </PageMain>
    </AppShell>
  );
}
