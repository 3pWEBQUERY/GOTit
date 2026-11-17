import type { Locale } from "@app/core/locale";
import { SUPPORT_CATEGORIES } from "@app/core/support";
import { getDb } from "@app/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { withSeoOverride } from "@/features/content/seo";
import { ContactForm } from "@/features/info/contact-form";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";
import { createHref } from "@/features/shell/nav/href";
import { getViewer } from "@/features/shell/queries/get-viewer";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "info.contact" });
  return withSeoOverride({ title: t("metaTitle"), description: t("intro") }, createHref(locale)("/kontakt"), locale);
}

/** Kontakt `/kontakt` (v2 7.3, 7.8): Supportanfrage mit oder ohne Konto. `?kategorie=appeal` wählt den Einspruch vor. */
export default async function ContactPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const [t, viewer, query] = await Promise.all([getTranslations({ locale, namespace: "info.contact" }), getViewer(), searchParams]);
  const accountEmail = viewer.kind === "account" ? ((await getDb().user.findUnique({ where: { id: viewer.userId }, select: { email: true } }))?.email ?? null) : null;
  const requested = typeof query.kategorie === "string" ? query.kategorie : undefined;
  const href = createHref(locale);
  return (
    <div className="flex max-w-reading min-w-0 flex-col gap-8">
      <TopBarTitle title={t("title")} />
      <header className="flex flex-col gap-3">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="max-w-prose text-body">{t("intro")}</p>
      </header>
      <ContactForm categories={SUPPORT_CATEGORIES} accountEmail={accountEmail} initialCategory={SUPPORT_CATEGORIES.find((value) => value === requested)} helpHref={href("/hilfe")} />
    </div>
  );
}
