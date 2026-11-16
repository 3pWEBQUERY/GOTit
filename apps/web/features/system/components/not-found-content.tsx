import type { Locale } from "@app/core/locale";
import { Button, EmptyState, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";

/** 404: nennt den nächsten sinnvollen Schritt, keine Sackgasse (PRD 8.2). */
export async function NotFoundContent({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "system" });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1">{t("notFound.title")}</h1>
      <EmptyState
        title={t("notFound.description")}
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <UiLink href={getPathname({ href: "/", locale })}>{t("notFound.home")}</UiLink>
            </Button>
            <Button asChild variant="secondary">
              <UiLink href={getPathname({ href: "/hilfe", locale })}>{t("notFound.help")}</UiLink>
            </Button>
          </div>
        }
      />
    </div>
  );
}
