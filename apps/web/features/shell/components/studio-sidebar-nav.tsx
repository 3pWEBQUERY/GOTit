"use client";

import { StudioSidebar, type SidebarItem } from "@app/ui";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { rememberPreference } from "../../appearance/apply-theme";
import { isCurrentPath, organizationSlugFromPath } from "../nav/is-current";

export const SIDEBAR_COOKIE = "studio_sidebar";

interface SidebarSet {
  items: readonly SidebarItem[];
  secondaryItems: readonly SidebarItem[];
}

export interface StudioSidebarNavProps {
  label: string;
  provider: SidebarSet | null;
  organizations: Readonly<Record<string, SidebarSet>>;
  /** Profilstatus mit «Pausieren»; nur im persönlichen Kontext. */
  status: ReactNode;
  initialCollapsed: boolean;
  labels: { collapse: string; expand: string };
}

/** Seitenleiste des Studios im passenden Kontext: eigenes Profil oder Organisation. */
export function StudioSidebarNav({ label, provider, organizations, status, initialCollapsed, labels }: StudioSidebarNavProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const organizationSlug = organizationSlugFromPath(pathname);
  const set = organizationSlug ? organizations[organizationSlug] : provider;
  if (!set) return null;

  const root = set.items[0]?.href;
  const mark = (item: SidebarItem): SidebarItem => ({ ...item, current: isCurrentPath(pathname, item.href, root ? [root] : []) });

  function onCollapsedChange(next: boolean) {
    setCollapsed(next);
    rememberPreference(SIDEBAR_COOKIE, next ? "collapsed" : "expanded");
  }

  return (
    <StudioSidebar
      label={label}
      items={set.items.map(mark)}
      secondaryItems={set.secondaryItems.map(mark)}
      status={organizationSlug ? null : status}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      labels={labels}
    />
  );
}
