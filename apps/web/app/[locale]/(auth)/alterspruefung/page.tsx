import type { Locale } from "@app/core/locale";
import { AgeGate, Button, UiLink } from "@app/ui";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { confirmAge } from "@/features/age-gate/actions/confirm-age";
import { getPathname } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/alterspruefung">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "ageGate" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function AgeCheckPage({ params, searchParams }: PageProps<"/[locale]/alterspruefung">) {
  const locale = (await params).locale as Locale;
  const { weiter } = await searchParams;
  const t = await getTranslations({ locale, namespace: "ageGate" });
  return (
    <AgeGate title={t("title")} description={t("description")} points={[t("points.adults"), t("points.scope"), t("points.noData")]}>
      <form action={confirmAge} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="weiter" value={typeof weiter === "string" ? weiter : ""} />
        <Button type="submit" variant="primary">
          {t("confirm")}
        </Button>
        <Button asChild variant="quiet">
          <UiLink href={getPathname({ href: "/hilfe", locale })}>{t("leave")}</UiLink>
        </Button>
      </form>
    </AgeGate>
  );
}
