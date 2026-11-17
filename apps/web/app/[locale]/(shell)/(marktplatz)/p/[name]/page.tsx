import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { PublicProfilePage } from "@/features/profile/components/page/public-profile-page";
import { profileMetadata } from "@/features/profile/metadata";
import { EDIT_PARAM } from "@/features/profile/sections";

type Props = { params: Promise<{ locale: string; name: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, name } = await params;
  return profileMetadata(locale as Locale, name, "overview");
}

/** Anbieterprofil, Übersicht (PRD v2 10). `?bearbeiten=<abschnitt>` öffnet für den Inhaber das Seitenpanel. */
export default async function ProfilePage({ params, searchParams }: Props) {
  const [{ locale, name }, query] = await Promise.all([params, searchParams]);
  const edit = query[EDIT_PARAM];
  return <PublicProfilePage locale={locale as Locale} slug={name} tab="overview" edit={typeof edit === "string" ? edit : undefined} />;
}
