import type { Locale } from "@app/core/locale";
import { Button, EmptyState, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";

/** 404 innerhalb des Admins, zum Beispiel für eine unbekannte Fall-ID. */
export async function AdminNotFound({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "admin.notFound" });
  const href = createHref(locale);
  return (
    <>
      <h1 className="text-h1">{t("title")}</h1>
      <EmptyState
        title={t("description")}
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <UiLink href={href("/admin/verifizierungen")}>{t("queue")}</UiLink>
            </Button>
            <Button asChild variant="secondary">
              <UiLink href={href("/admin")}>{t("overview")}</UiLink>
            </Button>
          </div>
        }
      />
    </>
  );
}
