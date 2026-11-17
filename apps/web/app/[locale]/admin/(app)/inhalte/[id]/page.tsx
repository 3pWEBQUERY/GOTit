import { getContentPage } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { areaAccess } from "@/features/admin/areas/access";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { ContentPageView } from "@/features/admin/content/content-page-view";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "contentEdit");
}

/** Seite bearbeiten `/admin/inhalte/[id]`. */
export default async function EditContentPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const access = await areaAccess("content.manage");
  if (!access.allowed) return <RestrictedArea locale={locale} area="content" />;
  const page = await getContentPage(access.actor.userId, id);
  if (!page) notFound();
  return <ContentPageView locale={locale} actorId={access.actor.userId} page={page} />;
}
