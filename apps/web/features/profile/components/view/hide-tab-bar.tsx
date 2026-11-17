"use client";

import { useEffect } from "react";

/**
 * Auf der Profilseite ersetzt die Kontaktleiste unter 768 px die Tab-Leiste
 * (PRD v2 10, 5.5: eine schwebende Leiste unten). Die Tab-Leiste gehört der
 * Shell; die Seite blendet sie für ihre Dauer aus und beim Verlassen wieder
 * ein. Ab 768 px ist sie ohnehin verborgen. Ein Inline-Stil am Element, weil
 * ein `style`-Element bei Navigation im Browser an der Nonce der CSP scheitert.
 */
export function HideTabBar() {
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>("[data-glass-tab-bar]");
    if (!bar) return;
    const previous = bar.style.display;
    bar.style.display = "none";
    return () => {
      bar.style.display = previous;
    };
  }, []);
  return null;
}
