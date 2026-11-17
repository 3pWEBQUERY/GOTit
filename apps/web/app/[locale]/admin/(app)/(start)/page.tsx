import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { OverviewSection } from "@/features/admin/components/overview-section";
import { adminMetadata } from "@/features/admin/metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return adminMetadata((await params).locale as Locale, "overview");
}

/** Plattformübersicht `/admin` (PRD 7.8). Weitere Bereiche folgen mit Schritt 1.13. */
export default async function AdminOverviewPage({ params }: Props) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return <OverviewSection locale={locale} />;
}
