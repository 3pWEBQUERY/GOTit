import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MessengerPage } from "@/features/messages/components/messenger-page";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/nachrichten/[id]">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "messages",
  });
  // Neutral: Der Browser-Tab nennt die Gegenseite nicht (PRD 13, Diskretion).
  return { title: t("threadMetaTitle") };
}

/** Eine Unterhaltung mit Liste und Kontext (PRD v2 11.4). */
export default async function ConversationPage({
  params,
  searchParams,
}: PageProps<"/[locale]/nachrichten/[id]">) {
  const [{ locale, id }, search] = await Promise.all([params, searchParams]);
  return (
    <MessengerPage
      locale={locale as Locale}
      area="member"
      search={search}
      conversationId={id}
    />
  );
}
