"use client";

import { GlassTopBar, IconButton } from "@app/ui";
import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { topBarTitleStore } from "../top-bar-title-store";

export interface MobileTopBarProps {
  defaultTitle: string;
  backLabel: string;
  /** Wurzeln der Tabs: dort gibt es kein Zurück. */
  rootPaths: readonly string[];
  homeHref: string;
  actions: ReactNode;
}

/** Mobile Top-Leiste. Zurück ist immer oben links und entspricht dem Browser-Zurück (PRD 6.4). */
export function MobileTopBar({ defaultTitle, backLabel, rootPaths, homeHref, actions }: MobileTopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = useSyncExternalStore(topBarTitleStore.subscribe, topBarTitleStore.get, topBarTitleStore.getServer);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(homeHref);
  }

  return (
    <GlassTopBar
      title={title ?? defaultTitle}
      back={rootPaths.includes(pathname) ? undefined : <IconButton label={backLabel} icon={<ChevronLeft strokeWidth={1.5} />} onClick={goBack} />}
      actions={actions}
    />
  );
}
