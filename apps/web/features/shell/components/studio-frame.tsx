import { isFeatureEnabled } from "@app/core/flags";
import { hasProviderRole } from "@app/core/identity";
import { countOpenInvitations } from "@app/core/organization";
import type { Locale } from "@app/core/locale";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { redirect } from "@/i18n/navigation";
import { createHref } from "../nav/href";
import { buildOrganizationSidebar, buildProviderSidebar } from "../nav/studio-nav";
import { getReturnPath } from "../queries/get-return-path";
import { getShellData } from "../queries/get-shell-data";
import { getUnreadCounts } from "../queries/get-unread-counts";
import { getViewer } from "../queries/get-viewer";
import { ProfileStatusForViewer } from "./profile-status-for-viewer";
import { SIDEBAR_COOKIE, StudioSidebarNav } from "./studio-sidebar-nav";

/** Rahmen aller Studio-Seiten: Anmeldung verlangt, Seitenleiste im passenden Kontext. */
export async function StudioFrame({ locale, children }: { locale: Locale; children: ReactNode }) {
  const viewer = await getViewer();
  if (viewer.kind === "visitor") {
    const weiter = await getReturnPath();
    return redirect({ href: { pathname: "/anmelden", query: weiter ? { weiter } : {} }, locale });
  }
  const provider = hasProviderRole(viewer);
  const [data, businessSuiteEnabled, tNav, tStudio, tShell, tClubs, cookieStore, unread, invitations] = await Promise.all([
    getShellData(locale),
    isFeatureEnabled("business-suite"),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "studio" }),
    getTranslations({ locale, namespace: "shell" }),
    getTranslations({ locale, namespace: "clubs" }),
    cookies(),
    getUnreadCounts(),
    provider ? countOpenInvitations(viewer.userId) : Promise.resolve(0),
  ]);
  const href = createHref(locale);
  const flags = { communityEnabled: data.communityEnabled, businessSuiteEnabled };
  const status = <ProfileStatusForViewer locale={locale} viewer={viewer} />;

  return (
    <div className="flex w-full flex-1">
      <StudioSidebarNav
        label={tStudio("sidebarLabel")}
        provider={
          provider
            ? buildProviderSidebar(
                tNav,
                href,
                flags,
                { value: unread.studio, label: tShell("unreadConversations", { count: unread.studio }) },
                { value: invitations, label: tClubs("studio.openInvitations", { count: invitations }) },
              )
            : null
        }
        organizations={Object.fromEntries(
          viewer.organizations.map((organization) => [organization.slug, buildOrganizationSidebar(tNav, href, organization, flags)]),
        )}
        status={status}
        initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
        labels={{ collapse: tStudio("collapseSidebar"), expand: tStudio("expandSidebar") }}
      />
      <main id="inhalt" tabIndex={-1} className="min-w-0 flex-1 px-4 pt-4 pb-28 outline-none md:px-6 md:pt-8 md:pb-16">
        <div className="mx-auto w-full max-w-content">{children}</div>
      </main>
    </div>
  );
}
