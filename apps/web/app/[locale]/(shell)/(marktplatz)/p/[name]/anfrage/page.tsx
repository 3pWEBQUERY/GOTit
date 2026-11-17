import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { PublicProfilePage } from "@/features/profile/components/page/public-profile-page";
import { profileMetadata } from "@/features/profile/metadata";

type Props = {
  params: Promise<{ locale: string; name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, name } = await params;
  // Das Panel ist kein eigener Inhalt: Canonical auf das Profil, nicht indexiert.
  return {
    ...(await profileMetadata(locale as Locale, name, "overview")),
    robots: { index: false, follow: false },
  };
}

/** Terminanfrage als Panel oder Sheet über dem Profil (PRD v2 10.2). */
export default async function ProfileRequestPage({
  params,
  searchParams,
}: Props) {
  const [{ locale, name }, search] = await Promise.all([params, searchParams]);
  return (
    <PublicProfilePage
      locale={locale as Locale}
      slug={name}
      tab="overview"
      request={{ search }}
    />
  );
}
