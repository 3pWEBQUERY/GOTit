import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudioProfilePage } from "@/features/profile/components/editor/studio-profile-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio/profil">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "profile.editor" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Mein Profil: Abschnitte mit Stand und Vorschau (PRD v2 11.2). */
export default async function StudioProfileListPage({ params }: PageProps<"/[locale]/studio/profil">) {
  return <StudioProfilePage locale={(await params).locale as Locale} section={null} />;
}
