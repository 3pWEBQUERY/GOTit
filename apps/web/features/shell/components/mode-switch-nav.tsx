"use client";

import { ModeSwitch } from "@app/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type MouseEvent, type ReactNode } from "react";
import { isStudioPath } from "../nav/is-current";

const STORAGE_KEYS = { marketplace: "shell:last-marketplace", studio: "shell:last-studio" } as const;
type Mode = keyof typeof STORAGE_KEYS;

function remember(mode: Mode, path: string) {
  try {
    sessionStorage.setItem(STORAGE_KEYS[mode], path);
  } catch {
    // Ohne Speicherzugriff führt der Wechsel zur Wurzel des Bereichs.
  }
}

function recall(mode: Mode): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEYS[mode]);
  } catch {
    return null;
  }
}

export interface ModeSwitchNavProps {
  label: string;
  marketplace: { label: string; href: string };
  studio: { label: string; href: string };
  contextMenu?: ReactNode;
  className?: string;
}

/**
 * ModeSwitch der Shell. Merkt sich pro Bereich die zuletzt besuchte Seite und
 * führt beim Wechsel dorthin zurück (PRD 8.1).
 */
export function ModeSwitchNav({ label, marketplace, studio, contextMenu, className }: ModeSwitchNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const inStudio = isStudioPath(pathname);

  useEffect(() => {
    remember(inStudio ? "studio" : "marketplace", `${pathname}${window.location.search}`);
  }, [pathname, inStudio]);

  function onSegmentClick(key: string, event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    const mode: Mode = key === "studio" ? "studio" : "marketplace";
    const root = mode === "studio" ? studio.href : marketplace.href;
    const last = recall(mode);
    const locale = pathname.split("/")[1];
    if (!last || last === root || !last.startsWith(`/${locale}`)) return;
    event.preventDefault();
    router.push(last);
  }

  return (
    <ModeSwitch
      label={label}
      className={className}
      onSegmentClick={onSegmentClick}
      contextMenu={contextMenu}
      segments={[
        { key: "marketplace", label: marketplace.label, href: marketplace.href, current: !inStudio },
        { key: "studio", label: studio.label, href: studio.href, current: inStudio },
      ]}
    />
  );
}
