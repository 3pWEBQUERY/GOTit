import type { ViewerOrganization } from "@app/core/identity";
import type { SidebarItem } from "@app/ui";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Images,
  Inbox,
  MapPin,
  Megaphone,
  MessageSquare,
  PenSquare,
  Settings,
  Sun,
  Tags,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";
import type { HrefBuilder } from "./href";

type Translate = (key: string) => string;
type Icon = ComponentType<{ strokeWidth?: number }>;

export interface StudioFlags {
  communityEnabled: boolean;
  businessSuiteEnabled: boolean;
}

function item(label: string, href: string, IconComponent: Icon): SidebarItem {
  return { label, href, icon: <IconComponent strokeWidth={1.5} /> };
}

/** Zahl an einem Eintrag, mit ihrer Bedeutung für Screenreader. */
export interface SidebarBadge {
  value: number;
  label: string;
}

/** Seitenleiste des Einzelanbieter-Studios in der Reihenfolge der PRD (6.2); «Nachrichten» zählt ungelesene Unterhaltungen. */
export function buildProviderSidebar(t: Translate, href: HrefBuilder, flags: StudioFlags, unread?: SidebarBadge) {
  const messages = item(t("studio.messages"), href("/studio/nachrichten"), MessageSquare);
  const items = [
    item(t("studio.today"), href("/studio"), Sun),
    item(t("studio.profile"), href("/studio/profil"), UserRound),
    item(t("studio.media"), href("/studio/medien"), Images),
    unread && unread.value > 0 ? { ...messages, badge: unread.value, badgeLabel: unread.label } : messages,
    item(t("studio.calendar"), href("/studio/kalender"), CalendarDays),
    item(t("studio.requests"), href("/studio/anfragen"), Inbox),
    ...(flags.communityEnabled ? [item(t("studio.posts"), href("/studio/beitraege"), PenSquare)] : []),
    item(t("studio.statistics"), href("/studio/statistik"), BarChart3),
    ...(flags.businessSuiteEnabled
      ? [item(t("studio.advertising"), href("/studio/werbung"), Megaphone), item(t("studio.billing"), href("/studio/abrechnung"), CreditCard)]
      : []),
  ];
  return { items, secondaryItems: [item(t("studio.settings"), href("/studio/einstellungen"), Settings)] };
}

/** Seitenleiste im Organisations-Kontext (PRD 12.2). */
export function buildOrganizationSidebar(t: Translate, href: HrefBuilder, organization: ViewerOrganization, flags: StudioFlags) {
  const params = { org: organization.slug };
  const phaseTwo = flags.businessSuiteEnabled;
  const items = [
    item(t("studio.today"), href({ pathname: "/studio/o/[org]", params }), Sun),
    item(t("organization.profile"), href({ pathname: "/studio/o/[org]/profil", params }), Building2),
    item(t("organization.locations"), href({ pathname: "/studio/o/[org]/standorte", params }), MapPin),
    item(t("organization.providers"), href({ pathname: "/studio/o/[org]/anbieter", params }), UsersRound),
    ...(phaseTwo ? [item(t("organization.team"), href({ pathname: "/studio/o/[org]/team", params }), Users)] : []),
    item(t("studio.media"), href({ pathname: "/studio/o/[org]/medien", params }), Images),
    ...(phaseTwo
      ? [
          item(t("studio.calendar"), href({ pathname: "/studio/o/[org]/kalender", params }), CalendarDays),
          item(t("organization.offers"), href({ pathname: "/studio/o/[org]/angebote", params }), Tags),
          item(t("studio.statistics"), href({ pathname: "/studio/o/[org]/statistik", params }), BarChart3),
          item(t("studio.advertising"), href({ pathname: "/studio/o/[org]/werbung", params }), Megaphone),
          item(t("studio.billing"), href({ pathname: "/studio/o/[org]/abrechnung", params }), CreditCard),
        ]
      : []),
    item(t("organization.credentials"), href({ pathname: "/studio/o/[org]/nachweise", params }), BadgeCheck),
  ];
  return { items, secondaryItems: [item(t("studio.settings"), href({ pathname: "/studio/o/[org]/einstellungen", params }), Settings)] };
}
