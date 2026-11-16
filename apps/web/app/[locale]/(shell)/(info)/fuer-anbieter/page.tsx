import type { Locale } from "@app/core/locale";
import { Button, UiLink } from "@app/ui";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";
import { createHref } from "@/features/shell/nav/href";

export async function generateMetadata({ params }: PageProps<"/[locale]/fuer-anbieter">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "forProviders" });
  return { title: t("metaTitle") };
}

export default async function ForProvidersPage({ params }: PageProps<"/[locale]/fuer-anbieter">) {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "forProviders" });
  const href = createHref(locale);
  return (
    <article className="flex max-w-reading flex-col gap-8">
      <TopBarTitle title={t("metaTitle")} />
      <header className="flex flex-col gap-4">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="max-w-prose text-body">{t("intro")}</p>
      </header>
      {(["trust", "control", "review"] as const).map((key) => (
        <section key={key} className="flex flex-col gap-2 border-t border-border pt-6">
          <h2 className="text-h2">{t(`sections.${key}.title`)}</h2>
          <p className="max-w-prose text-body">{t(`sections.${key}.text`)}</p>
        </section>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="primary">
          <UiLink href={href("/registrieren")}>{t("cta")}</UiLink>
        </Button>
        <Button asChild variant="secondary">
          <UiLink href={href("/sicherheit")}>{t("secondary")}</UiLink>
        </Button>
      </div>
    </article>
  );
}
