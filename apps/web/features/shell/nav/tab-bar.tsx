import type { TabBarItem } from "@app/ui";
import { BarChart3, Building2, CalendarDays, Compass, Heart, LogIn, MessageSquare, Sun, UserRound, UsersRound } from "lucide-react";
import type { HrefBuilder } from "./href";

type Translate = (key: string) => string;

export interface TabBarSets {
  visitor: TabBarItem[];
  member: TabBarItem[];
  /** Ohne «Mehr»: Diesen Tab ergänzt die Leiste selbst, weil er ein Sheet öffnet. */
  studio: TabBarItem[];
}

/** Zahl am Tab «Nachrichten» mit ihrer Bedeutung für Screenreader. */
export interface TabBadge {
  value: number;
  label: string;
}

/**
 * Tabs der mobilen Leiste je Zustand (PRD 6.4). «Nachrichten» steht in beiden
 * Modi an dritter Stelle und zählt die ungelesenen Unterhaltungen der Seite.
 */
export function buildTabBarSets(
  t: Translate,
  href: HrefBuilder,
  communityEnabled: boolean,
  unread: { member: TabBadge; studio: TabBadge },
): TabBarSets {
  const badge = ({ value, label }: TabBadge) => (value > 0 ? { badge: value, badgeLabel: label } : {});
  const discover: TabBarItem = { key: "discover", label: t("tabs.discover"), href: href("/"), icon: <Compass strokeWidth={1.5} /> };
  const community: TabBarItem[] = communityEnabled
    ? [{ key: "community", label: t("tabs.community"), href: href("/community"), icon: <UsersRound strokeWidth={1.5} /> }]
    : [];
  return {
    visitor: [
      discover,
      { key: "clubs", label: t("tabs.clubs"), href: href("/clubs"), icon: <Building2 strokeWidth={1.5} /> },
      ...community,
      { key: "sign-in", label: t("tabs.signIn"), href: href("/anmelden"), icon: <LogIn strokeWidth={1.5} /> },
    ],
    member: [
      discover,
      ...community,
      { key: "messages", label: t("tabs.messages"), href: href("/nachrichten"), icon: <MessageSquare strokeWidth={1.5} />, ...badge(unread.member) },
      { key: "favourites", label: t("tabs.favourites"), href: href("/favoriten"), icon: <Heart strokeWidth={1.5} /> },
      { key: "me", label: t("tabs.me"), href: href("/ich"), icon: <UserRound strokeWidth={1.5} /> },
    ],
    studio: [
      { key: "today", label: t("tabs.today"), href: href("/studio"), icon: <Sun strokeWidth={1.5} /> },
      { key: "calendar", label: t("tabs.calendar"), href: href("/studio/kalender"), icon: <CalendarDays strokeWidth={1.5} /> },
      { key: "messages", label: t("tabs.messages"), href: href("/studio/nachrichten"), icon: <MessageSquare strokeWidth={1.5} />, ...badge(unread.studio) },
      { key: "statistics", label: t("tabs.statistics"), href: href("/studio/statistik"), icon: <BarChart3 strokeWidth={1.5} /> },
    ],
  };
}
