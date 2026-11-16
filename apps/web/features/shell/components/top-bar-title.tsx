"use client";

import { useEffect } from "react";
import { topBarTitleStore } from "../top-bar-title-store";

/** Setzt den Titel der mobilen Top-Leiste für die Dauer der Seite. */
export function TopBarTitle({ title }: { title: string }) {
  useEffect(() => {
    topBarTitleStore.set(title);
    return () => topBarTitleStore.set(null);
  }, [title]);
  return null;
}
