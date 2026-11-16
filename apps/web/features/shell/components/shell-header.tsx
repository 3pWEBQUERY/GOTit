import { hasOrganizationRole, hasProviderRole, showsModeSwitch, type Viewer } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { AppHeader, Button, IconLink, MegaMenu, SearchField, UiLink, type MegaMenuColumn, type MegaMenuLink } from "@app/ui";
import { Bell, Heart, MessageSquare, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { HrefBuilder } from "../nav/href";
import { AccountMenu } from "./account-menu";
import { ModeSwitchNav } from "./mode-switch-nav";
import { MoreMenu } from "./more-menu";
import { NavLink } from "./nav-link";
import { NavigationSheet } from "./navigation-sheet";
import { StudioContextMenu } from "./studio-context-menu";

export interface ShellNavigation {
  discover: MegaMenuColumn[];
  community: MegaMenuColumn[] | null;
  more: MegaMenuLink[];
  primary: MegaMenuLink[];
}

interface Props {
  locale: Locale;
  viewer: Viewer;
  href: HrefBuilder;
  navigation: ShellNavigation;
  appName: string;
}

/** Wurzel des Studios für dieses Konto: das eigene Profil oder die erste Organisation. */
export function studioRootHref(viewer: Viewer, href: HrefBuilder): string {
  if (viewer.kind === "account" && !hasProviderRole(viewer) && viewer.organizations[0]) {
    return href({ pathname: "/studio/o/[org]", params: { org: viewer.organizations[0].slug } });
  }
  return href("/studio");
}

export async function ModeSwitchForViewer({ locale, viewer, href, className }: Pick<Props, "locale" | "viewer" | "href"> & { className?: string }) {
  if (!showsModeSwitch(viewer) || viewer.kind !== "account") return null;
  const t = await getTranslations({ locale, namespace: "shell" });
  const contexts = [
    ...(hasProviderRole(viewer) ? [{ key: "own", label: t("mode.ownProfile"), href: href("/studio") }] : []),
    ...viewer.organizations.map((organization) => ({
      key: organization.slug,
      label: organization.name,
      href: href({ pathname: "/studio/o/[org]", params: { org: organization.slug } }),
    })),
  ];
  return (
    <ModeSwitchNav
      label={t("mode.label")}
      className={className}
      marketplace={{ label: t("mode.marketplace"), href: href("/") }}
      studio={{ label: t("mode.studio"), href: studioRootHref(viewer, href) }}
      contextMenu={hasOrganizationRole(viewer) && contexts.length > 1 ? <StudioContextMenu label={t("mode.context")} contexts={contexts} /> : undefined}
    />
  );
}

/** Kopfzeile der einen Shell, für alle Bereiche ausser Admin (PRD 6.2). */
export async function ShellHeader({ locale, viewer, href, navigation, appName }: Props) {
  const t = await getTranslations({ locale, namespace: "shell" });
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const sections = [...navigation.discover, ...(navigation.community ?? []), { heading: tNav("more.label"), links: navigation.more }];

  return (
    <AppHeader
      navigationLabel={t("mainNavigation")}
      logo={
        <UiLink href={href("/")} className="inline-flex min-h-11 items-center rounded-control px-1 text-h3 text-ink">
          {appName}
        </UiLink>
      }
      modeSwitch={<ModeSwitchForViewer locale={locale} viewer={viewer} href={href} />}
      navigation={
        <>
          <MegaMenu label={tNav("discover.label")} columns={navigation.discover} />
          {navigation.primary.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} />
          ))}
          {navigation.community ? <MegaMenu label={tNav("community.label")} columns={navigation.community} /> : null}
          <MoreMenu label={tNav("more.label")} links={navigation.more} />
        </>
      }
      navigationTrigger={
        <NavigationSheet
          variant="panel"
          labels={{ open: t("openNavigation"), title: t("navigationTitle"), close: t("close"), handle: t("sheetHandle") }}
          primaryLinks={navigation.primary}
          sections={sections}
        />
      }
      search={
        <SearchField asForm action={href("/suche")} name="q" label={t("search.label")} hideLabel placeholder={t("search.placeholder")} clearLabel={t("search.clear")} />
      }
      searchTrigger={<IconLink href={href("/suche")} label={t("search.label")} icon={<Search strokeWidth={1.5} />} />}
      actions={<HeaderActions locale={locale} viewer={viewer} href={href} />}
    />
  );
}

async function HeaderActions({ locale, viewer, href }: Pick<Props, "locale" | "viewer" | "href">) {
  const t = await getTranslations({ locale, namespace: "shell" });
  if (viewer.kind === "visitor") {
    return (
      <>
        <Button asChild variant="quiet">
          <UiLink href={href("/anmelden")}>{t("signIn")}</UiLink>
        </Button>
        <Button asChild variant="primary">
          <UiLink href={href("/fuer-anbieter")}>{t("startAsProvider")}</UiLink>
        </Button>
      </>
    );
  }
  return (
    <>
      <IconLink href={href("/benachrichtigungen")} label={t("notifications")} icon={<Bell strokeWidth={1.5} />} />
      <IconLink href={href("/nachrichten")} label={t("messages")} icon={<MessageSquare strokeWidth={1.5} />} />
      <IconLink href={href("/favoriten")} label={t("favourites")} icon={<Heart strokeWidth={1.5} />} />
      <AccountMenu
        name={viewer.name}
        label={t("account.label")}
        signOut={{ label: t("account.signOut"), redirectTo: href("/") }}
        links={[
          { label: t("account.overview"), href: href("/ich") },
          { label: t("account.appointments"), href: href("/termine") },
          { label: t("account.savedSearches"), href: href("/suchen") },
          { label: t("account.reviews"), href: href("/bewertungen") },
          { label: t("account.settings"), href: href("/einstellungen/profil") },
        ]}
      />
    </>
  );
}
