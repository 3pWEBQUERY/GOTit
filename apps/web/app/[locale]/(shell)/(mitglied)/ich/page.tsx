import type { Locale } from "@app/core/locale";
import { CalendarClock, Eye, Inbox, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requireAccount } from "@/features/account/require-account";
import { LinkList } from "@/features/member/components/link-list";
import { OverviewList } from "@/features/member/components/overview-list";
import { getMemberOverview } from "@/features/member/queries/get-member-overview";
import { settingsLinks } from "@/features/settings/nav";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";
import { createHref } from "@/features/shell/nav/href";

export async function generateMetadata({ params }: PageProps<"/[locale]/ich">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "member.overview" });
  return { title: t("metaTitle") };
}

/** Übersicht des Mitgliederbereichs (PRD 12.1): drei Listen, Kurzlinks, Einstellungen, zuletzt angesehen. */
export default async function MemberOverviewPage({ params }: PageProps<"/[locale]/ich">) {
  const locale = (await params).locale as Locale;
  const viewer = await requireAccount(locale);
  const [t, settings, overview] = await Promise.all([
    getTranslations({ locale, namespace: "member.overview" }),
    getTranslations({ locale, namespace: "settings" }),
    getMemberOverview(viewer.userId, locale),
  ]);
  const href = createHref(locale);
  const discover = { label: t("discover"), href: href("/") };
  const shortcuts = [
    { key: "favourites", href: href("/favoriten"), label: t("shortcuts.favourites") },
    { key: "savedSearches", href: href("/suchen"), label: t("shortcuts.savedSearches") },
    { key: "reviews", href: href("/bewertungen"), label: t("shortcuts.reviews") },
  ];
  const list = (
    id: string,
    key: "requests" | "conversations" | "appointments" | "recentlyViewed",
    entries: typeof overview.openRequests,
    icon: ReactNode,
    more?: { label: string; href: string },
  ) => (
    <OverviewList
      id={id}
      title={t(`${key}.title`)}
      entries={entries}
      empty={{ title: t(`${key}.emptyTitle`), text: t(`${key}.emptyText`), icon, action: discover }}
      more={more}
    />
  );

  return (
    <div className="flex max-w-reading flex-col gap-8">
      <TopBarTitle title={t("title")} />
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-body text-ink-muted">{t("greeting", { name: viewer.name })}</p>
      </header>
      {list("offene-anfragen", "requests", overview.openRequests, <Inbox strokeWidth={1.5} />, { label: t("requests.all"), href: href("/termine") })}
      {list("ungelesen", "conversations", overview.unreadConversations, <MessageCircle strokeWidth={1.5} />, { label: t("conversations.all"), href: href("/nachrichten") })}
      {list("naechste-termine", "appointments", overview.upcomingAppointments, <CalendarClock strokeWidth={1.5} />, { label: t("appointments.all"), href: href({ pathname: "/termine", query: { ansicht: "bestaetigt" } }) })}
      <LinkList id="kurzlinks" title={t("shortcuts.title")} links={shortcuts} />
      <LinkList id="einstellungen" title={t("settingsTitle")} links={settingsLinks(href, (section) => settings(`sections.${section}`))} />
      {list("zuletzt-angesehen", "recentlyViewed", overview.recentlyViewed, <Eye strokeWidth={1.5} />)}
    </div>
  );
}
