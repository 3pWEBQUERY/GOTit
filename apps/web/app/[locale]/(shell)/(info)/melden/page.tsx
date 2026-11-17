import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { withSeoOverride } from "@/features/content/seo";
import { PublicReportForm } from "@/features/info/report-form";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";
import { createHref } from "@/features/shell/nav/href";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "info.report" });
  return withSeoOverride({ title: t("metaTitle"), description: t("intro") }, createHref(locale)("/melden"), locale);
}

/** Melden `/melden` (v2 7.3, 7.8): Inhalt ohne Konto melden. `?url=` füllt die Adresse vor. */
export default async function ReportPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const [t, query] = await Promise.all([getTranslations({ locale, namespace: "info.report" }), searchParams]);
  const initialUrl = typeof query.url === "string" ? query.url.slice(0, 500) : "";
  const href = createHref(locale);
  return (
    <div className="flex max-w-reading min-w-0 flex-col gap-8">
      <TopBarTitle title={t("title")} />
      <header className="flex flex-col gap-3">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="max-w-prose text-body">{t("intro")}</p>
      </header>
      <PublicReportForm initialUrl={initialUrl} homeHref={href("/")} />
    </div>
  );
}
