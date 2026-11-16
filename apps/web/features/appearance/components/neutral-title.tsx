"use client";

import { useEffect } from "react";

/**
 * Diskretion (PRD 13): Der Titel im Browser-Tab bleibt neutral, auch wenn eine
 * Seite ihn beim Navigieren setzt.
 */
export function NeutralTitle({ title }: { title: string }) {
  useEffect(() => {
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    const head = document.querySelector("head");
    if (!head) return;
    const observer = new MutationObserver(apply);
    observer.observe(head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);
  return null;
}
