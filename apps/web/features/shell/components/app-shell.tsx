import { isFeatureEnabled } from "@app/core/flags";
import { hasProviderRole, showsModeSwitch } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { IconLink, SkipLink } from "@app/ui";
import { Bell, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { createHref } from "../nav/href";
import { buildCommunityColumns, buildDiscoverColumns, buildMoreLinks } from "../nav/marketplace-nav";
import { buildProviderSidebar } from "../nav/studio-nav";
import { buildTabBarSets } from "../nav/tab-bar";
import { getShellData } from "../queries/get-shell-data";
import { getUnreadCounts } from "../queries/get-unread-counts";
import { getViewer } from "../queries/get-viewer";
import { CommandPalette, type CommandItem } from "./command-palette";
import { MobileTabBar } from "./mobile-tab-bar";
import { MobileTopBar } from "./mobile-top-bar";
import { NavigationSheet } from "./navigation-sheet";
import { ProfileStatusForViewer } from "./profile-status-for-viewer";
import { ModeSwitchForViewer, ShellHeader, studioRootHref, type ShellNavigation } from "./shell-header";

const APP_NAME = process.env.APP_NAME ?? "TheGND";

/**
 * Die eine Shell für Marktplatz, Community, Mitgliederbereich und Studio
 * (PRD 6). Kopfzeile und mobile Navigation liegen hier und bleiben beim
 * Wechsel zwischen den Bereichen stehen.
 */
export async function AppShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [viewer, data, businessSuiteEnabled, t, tNav, unread] = await Promise.all([
    getViewer(),
    getShellData(locale),
    isFeatureEnabled("business-suite"),
    getTranslations({ locale, namespace: "shell" }),
    getTranslations({ locale, namespace: "nav" }),
    getUnreadCounts(),
  ]);
  const href = createHref(locale);
  const navigation: ShellNavigation = {
    discover: buildDiscoverColumns(tNav, href, data, viewer),
    community: data.communityEnabled ? buildCommunityColumns(tNav, href) : null,
    more: buildMoreLinks(tNav, href),
    primary: [
      { label: tNav("profiles"), href: href("/profile") },
      { label: tNav("clubs"), href: href("/clubs") },
    ],
  };
  const sections = [...navigation.discover, ...(navigation.community ?? []), { heading: tNav("more.label"), links: navigation.more }];
  const tabSets = buildTabBarSets(tNav, href, data.communityEnabled, {
    member: { value: unread.member, label: t("unreadConversations", { count: unread.member }) },
    studio: { value: unread.studio, label: t("unreadConversations", { count: unread.studio }) },
  });
  const provider = hasProviderRole(viewer) ? buildProviderSidebar(tNav, href, { communityEnabled: data.communityEnabled, businessSuiteEnabled }) : null;
  const studioTabRoots = new Set(tabSets.studio.map((tab) => tab.href));
  const moreLinks = provider ? [...provider.items, ...provider.secondaryItems].filter((item) => !studioTabRoots.has(item.href)) : [];

  const commandItems: CommandItem[] = [
    ...navigation.primary.map((link) => ({ ...link, group: t("mode.marketplace") })),
    ...navigation.discover.flatMap((column) => column.links.map((link) => ({ ...link, group: column.heading }))),
    ...navigation.more.map((link) => ({ ...link, group: tNav("more.label") })),
    ...(provider ? provider.items.map((item) => ({ label: item.label, href: item.href, group: t("mode.studio") })) : []),
  ].filter((item, index, all) => all.findIndex((other) => other.href === item.href) === index);

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink href="#inhalt">{t("skipToContent")}</SkipLink>
      <ShellHeader locale={locale} viewer={viewer} href={href} navigation={navigation} appName={APP_NAME} />
      <MobileTopBar
        defaultTitle={APP_NAME}
        backLabel={t("back")}
        homeHref={href("/")}
        rootPaths={[...tabSets.visitor, ...tabSets.member, ...tabSets.studio].flatMap((tab) => (tab.href ? [tab.href] : []))}
        actions={
          <>
            <IconLink href={href("/suche")} label={t("search.label")} icon={<Search strokeWidth={1.5} />} />
            {viewer.kind === "account" ? <IconLink href={href("/benachrichtigungen")} label={t("notifications")} icon={<Bell strokeWidth={1.5} />} /> : null}
            <NavigationSheet
              variant="sheet"
              labels={{ open: t("openNavigation"), title: t("navigationTitle"), close: t("close"), handle: t("sheetHandle") }}
              primaryLinks={navigation.primary}
              sections={sections}
            />
          </>
        }
      />
      <div aria-hidden className="h-14 shrink-0 md:hidden" />
      {showsModeSwitch(viewer) ? (
        <div className="px-4 pt-2 md:hidden">
          <ModeSwitchForViewer locale={locale} viewer={viewer} href={href} />
        </div>
      ) : null}
      {children}
      <MobileTabBar
        label={t("tabBar")}
        sets={{ ...tabSets, studio: tabSets.studio.map((tab) => (tab.key === "today" ? { ...tab, href: studioRootHref(viewer, href) } : tab)) }}
        account={viewer.kind === "account"}
        more={
          provider
            ? {
                label: tNav("tabs.more"),
                title: tNav("tabs.more"),
                closeLabel: t("close"),
                handleLabel: t("sheetHandle"),
                links: moreLinks,
                status: <ProfileStatusForViewer locale={locale} viewer={viewer} />,
              }
            : null
        }
      />
      <CommandPalette items={commandItems} labels={{ title: t("palette.title"), input: t("palette.input"), empty: t("palette.empty"), close: t("close") }} />
    </div>
  );
}
