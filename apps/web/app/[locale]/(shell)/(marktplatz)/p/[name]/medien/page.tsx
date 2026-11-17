import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { PublicProfilePage } from "@/features/profile/components/page/public-profile-page";
import { profileMetadata } from "@/features/profile/metadata";
import { EDIT_PARAM } from "@/features/profile/sections";

type Props = { params: Promise<{ locale: string; name: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, name } = await params;
  return profileMetadata(locale as Locale, name, "media");
}

/** Tab «Medien» des Profils (PRD v2 7.1); `noindex`, Canonical auf die Übersicht. */
export default async function ProfileMediaPage({ params, searchParams }: Props) {
  const [{ locale, name }, query] = await Promise.all([params, searchParams]);
  const edit = query[EDIT_PARAM];
  return <PublicProfilePage locale={locale as Locale} slug={name} tab="media" edit={typeof edit === "string" ? edit : undefined} />;
}
