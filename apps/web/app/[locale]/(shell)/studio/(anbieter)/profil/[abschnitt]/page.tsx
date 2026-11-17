import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { StudioProfilePage } from "@/features/profile/components/editor/studio-profile-page";
import { sectionFromSlug, sectionSlug } from "@/features/profile/sections";
import { createHref } from "@/features/shell/nav/href";

type Props = { params: Promise<{ locale: string; abschnitt: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, abschnitt } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "profile.editor" });
  const section = sectionFromSlug(abschnitt);
  return { title: section ? `${t(`section.${section}`)} · ${t("title")}` : t("title"), robots: { index: false, follow: false } };
}

/** Ein Abschnitt von «Mein Profil» mit Formular und Live-Vorschau (PRD v2 11.2). */
export default async function StudioProfileSectionPage({ params }: Props) {
  const { locale: rawLocale, abschnitt } = await params;
  const locale = rawLocale as Locale;
  const section = sectionFromSlug(abschnitt);
  if (!section) notFound();
  if (sectionSlug(locale, section) !== abschnitt) redirect(createHref(locale)({ pathname: "/studio/profil/[abschnitt]", params: { abschnitt: sectionSlug(locale, section) } }));
  return <StudioProfilePage locale={locale} section={section} />;
}
