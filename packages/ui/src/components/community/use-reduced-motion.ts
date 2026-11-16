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
 * Meldet, ob Bewegung reduziert werden soll: über die Einstellung des Geräts oder
 * über `data-motion="reduced"` am Wurzelelement (Einstellung der App).
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
