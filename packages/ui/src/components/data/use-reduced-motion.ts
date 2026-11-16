"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches || document.documentElement.dataset.motion === "reduced";
}

/**
 * `true`, wenn das Gerät oder die Einstellung «Bewegung reduzieren» der
 * Plattform (`data-motion="reduced"`) Animationen abwählt. Auf dem Server gilt
 * `true`, damit nichts animiert, bevor die Antwort feststeht.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
