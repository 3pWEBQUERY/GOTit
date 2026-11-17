"use client";

import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => undefined;
}

function browserZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/**
 * Zeitzone des Browsers. Auf dem Server und beim ersten Rendern `null`: Der
 * Name der Zone des Anbieters erscheint erst, wenn klar ist, dass sie abweicht.
 */
export function useViewerZone(): string | null {
  return useSyncExternalStore(subscribe, browserZone, () => null);
}
