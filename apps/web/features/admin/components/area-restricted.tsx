import type { Locale } from "@app/core/locale";
import { Button, InlineAlert, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { AdminPageHeader } from "./page-header";

/** Bereich ohne passende Rolle: sichtbar erklärt, kein Klick, der mit 403 endet (PRD 13). */
export async function AreaRestricted({ locale, title, description, alertTitle }: { locale: Locale; title?: string; description?: string; alertTitle?: string }) {
  const t = await getTranslations({ locale, namespace: "admin" });
  return (
    <>
      <AdminPageHeader title={title ?? t("queue.title")} />
      <InlineAlert
        title={alertTitle ?? t("restricted.title")}
        action={
          <Button asChild variant="secondary">
            <UiLink href={createHref(locale)("/admin")}>{t("restricted.action")}</UiLink>
          </Button>
        }
      >
        {description ?? t("restricted.description")}
      </InlineAlert>
    </>
  );
}
