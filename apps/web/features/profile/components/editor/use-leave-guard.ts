"use client";

import { useEffect, useState } from "react";

/**
 * Rückfrage beim Verlassen mit ungespeicherten Änderungen (PRD v2 11.2, 13).
 * Links innerhalb der App fängt sie ab und fragt nach; Neuladen und Schliessen
 * fragt der Browser. Die Eingaben liegen ohnehin im Zwischenspeicher.
 */
export function useLeaveGuard(dirty: boolean) {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setTarget(`${url.pathname}${url.search}${url.hash}`);
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("click", click, true);
    };
  }, [dirty]);

  return { target, cancel: () => setTarget(null) };
}
