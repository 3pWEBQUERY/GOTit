"use client";

import { useEffect } from "react";

/**
 * Im Thread ist die Ansicht unter 768 px ein Vollbild (PRD v2 6.4, 11.4): Der
 * Footer der Shell tritt für die Dauer der Seite zurück. Ab 768 px bleibt er.
 */
export function HideFooterOnMobile() {
  useEffect(() => {
    const footers = Array.from(document.querySelectorAll("footer")).filter(
      (footer) => !footer.closest("#inhalt"),
    );
    for (const footer of footers) footer.classList.add("max-md:hidden");
    return () => {
      for (const footer of footers) footer.classList.remove("max-md:hidden");
    };
  }, []);
  return null;
}
