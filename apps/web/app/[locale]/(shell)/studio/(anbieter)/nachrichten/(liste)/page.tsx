import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MessengerPage } from "@/features/messages/components/messenger-page";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/studio/nachrichten">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "messages",
  });
  return { title: t("title") };
}

/** Postfach (PRD v2 11.4); Ansicht, Suche und Label stehen in der URL. */
export default async function MessagesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/studio/nachrichten">) {
  const [{ locale }, search] = await Promise.all([params, searchParams]);
  return (
    <MessengerPage locale={locale as Locale} area="studio" search={search} />
  );
}
